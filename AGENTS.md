# AGENTS.md — Instructions for Cursor

This file is the entry point for any AI coding agent (Cursor) working in this repo. Read the referenced docs before generating code for the relevant area.

## Project

**Squeaky Wheel (Focus3)** — a mobile AI executive assistant for multi-venture founders. Full product spec: `docs/PRD.md`. Full architecture: `docs/ARCHITECTURE.md`. Database: `docs/DATABASE_SCHEMA.md`. Core screen UX: `docs/UX_DAILY_CHECKIN.md`. LLM behavior: `docs/SYSTEM_PROMPT.md`.

## Stack (do not deviate without discussion)

- Mobile: React Native + Expo (managed workflow), TypeScript.
- Backend: NestJS (Node/TypeScript), REST + WebSocket for chat streaming.
- Database: Postgres with `pgvector` extension.
- Auth: Supabase Auth (or Clerk — pick one at project init and stay consistent).
- LLM: Vercel AI SDK (`ai` package), called only from the backend, never from the client. Default provider is Claude via `@ai-sdk/anthropic`, but the provider must stay swappable via a single config/env value — never hardcode a provider SDK call directly in business logic.
- Calendar: Google Calendar API first; Apple EventKit as an iOS-native fast-follow.

## Repo Structure (target)

```
AGENTS.md            -- this file (repo root)
/apps
  /mobile          -- Expo RN app
  /backend         -- NestJS API
/packages
  /shared-types    -- TS types shared between mobile and backend (API contracts, DB row types)
/docs
  PRD.md
  ARCHITECTURE.md
  DATABASE_SCHEMA.md
  UX_DAILY_CHECKIN.md
  SYSTEM_PROMPT.md
```

Use a monorepo (pnpm workspaces or Turborepo) so `shared-types` can be imported by both apps without duplication — API request/response shapes and DB row types should be defined once.

## Build Order (follow this sequence, don't jump ahead)

1. **Backend skeleton + DB migrations** from `docs/DATABASE_SCHEMA.md`. Get auth and venture CRUD working end-to-end before touching AI features.
2. **Venture + Goal management** (mobile screens + backend endpoints). This is plain CRUD, no AI yet — get it solid first since everything else depends on this data existing.
3. **Anti-Stall Engine** as a standalone, testable backend service/module. This is deterministic logic (see `docs/ARCHITECTURE.md` §3.2) — write unit tests for the scoring math before wiring it to the LLM.
4. **LLM Orchestrator**: decomposition flow first (goal → task tree), using the `create_task_tree` tool contract from `docs/SYSTEM_PROMPT.md`. Validate against `docs/DATABASE_SCHEMA.md`'s `tasks` table.
5. **Daily proposal flow**: wire Anti-Stall Engine output + calendar availability into the orchestrator's `propose_daily_tasks` tool call.
6. **Daily Check-In screen** (mobile) per `docs/UX_DAILY_CHECKIN.md` — chat UI with inline task cards, approve/adjust/confirm states.
7. **Calendar Module**: OAuth2 + write-only event creation for confirmed daily tasks.
8. **Evening check-in** (v1.1) — only after the morning flow is solid end to end.

Do not start on voice input, bi-directional calendar sync, or multi-user features — these are explicitly out of scope for v1 per `docs/PRD.md` §6.

## Hard Constraints to Enforce in Code (not just prompt-level)

- **Max 3 daily tasks** is enforced at the DB level (`daily_plan_tasks.slot` check constraint + unique index) — mirror this in the API layer (reject any request that would create a 4th) and in the UI (no "add task" affordance on the check-in screen). Treat any code path that allows a 4th task as a bug, regardless of source.
- **LLM output must come through tool calls**, never parsed from free-form text. If you're writing code that parses assistant prose to extract task data, stop — define/extend the tool schema (Zod, via the AI SDK) instead.
- **Never call a provider SDK (Anthropic/OpenAI) directly from application code.** Always go through the Vercel AI SDK abstraction so the model can be swapped via config. Provider selection lives in one place (e.g., `apps/backend/src/llm/provider.ts`).
- **The Anti-Stall Engine is deterministic and LLM-free.** Do not let the LLM decide venture urgency; it only receives urgency scores as input and decides which specific task to propose per venture.

## Conventions

- TypeScript strict mode on both apps.
- Shared DB row types and API DTOs live in `packages/shared-types`; do not redefine the same shape in both `apps/mobile` and `apps/backend`.
- Prefer small, focused PRs following the build order above — each numbered step should be reviewable independently.
- Write unit tests for the Anti-Stall Engine and any calendar-slot-finding logic — these are pure functions with clear expected outputs and are the easiest place for silent bugs to hide.

## When Unsure

If a requirement in generated code conflicts with `docs/PRD.md`, `docs/ARCHITECTURE.md`, or the hard constraints above, stop and flag the conflict rather than picking a default — these documents are the source of truth for product behavior.
