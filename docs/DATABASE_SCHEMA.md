# Database Schema — Squeaky Wheel (Focus3)

Postgres (with `pgvector` extension enabled). Written as DDL Cursor can run directly via a migration tool (e.g., Prisma, Drizzle, or raw SQL migrations — pick one and keep it consistent).

```sql
create extension if not exists "uuid-ossp";
create extension if not exists vector;

-- ============================================================
-- USERS
-- ============================================================
create table users (
    id              uuid primary key default uuid_generate_v4(),
    email           text unique not null,
    display_name    text,
    timezone        text not null default 'UTC',
    checkin_time    time not null default '08:00', -- preferred morning check-in time
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- ============================================================
-- VENTURES
-- ============================================================
create table ventures (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references users(id) on delete cascade,
    name            text not null,
    description     text,
    priority_weight numeric(3,2) not null default 1.0, -- relative importance, used by anti-stall engine
    status          text not null default 'active' check (status in ('active','paused','archived')),
    max_days_without_attention integer not null default 3, -- anti-stall hard ceiling
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_ventures_user on ventures(user_id) where status = 'active';

-- ============================================================
-- GOALS (long-term, per venture)
-- ============================================================
create table goals (
    id              uuid primary key default uuid_generate_v4(),
    venture_id      uuid not null references ventures(id) on delete cascade,
    title           text not null,
    description     text,
    deadline        date,
    status          text not null default 'active' check (status in ('active','done','abandoned')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_goals_venture on goals(venture_id);

-- ============================================================
-- VENTURE CONTEXT EMBEDDINGS (vector store, retrieval-augmented context)
-- ============================================================
create table venture_context_chunks (
    id              uuid primary key default uuid_generate_v4(),
    venture_id      uuid not null references ventures(id) on delete cascade,
    source_type     text not null check (source_type in ('goal','note','checkin_summary','manual_input')),
    source_id       uuid, -- nullable pointer back to goals.id / checkins.id etc.
    content         text not null,
    embedding       vector(1536), -- adjust dimension to embedding model used
    created_at      timestamptz not null default now()
);

create index idx_context_venture on venture_context_chunks(venture_id);
create index idx_context_embedding on venture_context_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ============================================================
-- TASKS (hierarchical: project -> epic -> micro-task via parent_task_id)
-- ============================================================
create table tasks (
    id              uuid primary key default uuid_generate_v4(),
    venture_id      uuid not null references ventures(id) on delete cascade,
    goal_id         uuid references goals(id) on delete set null,
    parent_task_id  uuid references tasks(id) on delete cascade,
    title           text not null,
    description     text,
    level           text not null check (level in ('project','epic','task','micro_task')),
    estimated_minutes integer, -- used for calendar blocking
    status          text not null default 'backlog'
                        check (status in ('backlog','proposed','scheduled','done','skipped','rescheduled')),
    generated_by    text not null default 'ai' check (generated_by in ('ai','user')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index idx_tasks_venture on tasks(venture_id);
create index idx_tasks_parent on tasks(parent_task_id);
create index idx_tasks_status on tasks(status);

-- ============================================================
-- DAILY PLANS (the "Rule of 3" — exactly one row per user per day)
-- ============================================================
create table daily_plans (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references users(id) on delete cascade,
    plan_date       date not null,
    status          text not null default 'proposed'
                        check (status in ('proposed','confirmed','completed')),
    created_at      timestamptz not null default now(),
    unique (user_id, plan_date)
);

-- Exactly the 3 tasks for that day (enforced at application layer + a check below)
create table daily_plan_tasks (
    id              uuid primary key default uuid_generate_v4(),
    daily_plan_id   uuid not null references daily_plans(id) on delete cascade,
    task_id         uuid not null references tasks(id) on delete cascade,
    slot            smallint not null check (slot in (1,2,3)), -- enforces max 3 at the DB level
    rationale       text, -- AI's one-line explanation ("Venture X hasn't had attention in 3 days")
    calendar_event_id text, -- external calendar event id once blocked
    outcome         text check (outcome in ('done','not_done','partial')),
    created_at      timestamptz not null default now(),
    unique (daily_plan_id, slot)
);

create index idx_dpt_plan on daily_plan_tasks(daily_plan_id);

-- ============================================================
-- CHECK-INS (conversational sessions)
-- ============================================================
create table checkins (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references users(id) on delete cascade,
    daily_plan_id   uuid references daily_plans(id) on delete set null,
    type            text not null check (type in ('morning','evening')),
    status          text not null default 'in_progress'
                        check (status in ('in_progress','completed','abandoned')),
    started_at      timestamptz not null default now(),
    completed_at    timestamptz
);

create table checkin_messages (
    id              uuid primary key default uuid_generate_v4(),
    checkin_id      uuid not null references checkins(id) on delete cascade,
    role            text not null check (role in ('user','assistant')),
    content         text not null,
    created_at      timestamptz not null default now()
);

create index idx_checkin_messages_checkin on checkin_messages(checkin_id);

-- ============================================================
-- VENTURE ATTENTION LOG (feeds the anti-stall rolling window)
-- ============================================================
create table venture_attention_log (
    id              uuid primary key default uuid_generate_v4(),
    venture_id      uuid not null references ventures(id) on delete cascade,
    daily_plan_id   uuid not null references daily_plans(id) on delete cascade,
    attended_at     date not null,
    created_at      timestamptz not null default now()
);

create index idx_attention_venture_date on venture_attention_log(venture_id, attended_at desc);

-- ============================================================
-- CALENDAR CONNECTIONS
-- ============================================================
create table calendar_connections (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references users(id) on delete cascade,
    provider        text not null check (provider in ('google','apple')),
    access_token    text not null, -- encrypt at rest / use a secrets-aware column type
    refresh_token   text,
    token_expires_at timestamptz,
    external_calendar_id text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
```

## Key Design Notes

- **`daily_plan_tasks.slot`** with a `unique (daily_plan_id, slot)` constraint and a `check (slot in (1,2,3))` is what makes "max 3 tasks" a database-level guarantee, not just a UI convention — this directly encodes the Rule of 3.
- **`venture_attention_log`** is the source of truth the Anti-Stall Engine reads from to compute `days_since_last_attention` and 7-day attention counts per venture — keep this append-only, never mutate rows.
- **Task hierarchy** uses a single self-referencing `tasks` table (`parent_task_id`) rather than separate `projects`/`epics` tables — simpler migrations, and the AI decomposition naturally produces variable-depth trees.
- **`venture_context_chunks`** is the RAG store: goals, notes, and check-in summaries get embedded and chunked here so the LLM Orchestrator can pull relevant context without stuffing the entire venture history into every prompt.
- Add a nightly job (or on-write trigger) that re-embeds new/edited `goals` and important `checkin_messages` into `venture_context_chunks`.
