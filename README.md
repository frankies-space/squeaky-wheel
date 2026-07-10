# Squeaky Wheel (Focus3)

A mobile AI executive assistant for multi-venture founders. Enforces the **Rule of 3** — exactly three essential tasks per day — and balances attention across ventures so none stall.

## Documentation

| Doc | Description |
|---|---|
| [AGENTS.md](./AGENTS.md) | Entry point for AI coding agents (Cursor) |
| [docs/PRD.md](./docs/PRD.md) | Product requirements |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Technical architecture |
| [docs/DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md) | Postgres schema (DDL) |
| [docs/UX_DAILY_CHECKIN.md](./docs/UX_DAILY_CHECKIN.md) | Daily check-in screen UX |
| [docs/SYSTEM_PROMPT.md](./docs/SYSTEM_PROMPT.md) | LLM orchestrator system prompt |

## Stack

React Native + Expo · NestJS · Postgres + pgvector · Supabase Auth · Vercel AI SDK · Google Calendar API

## Getting started (backend — step 1)

### Prerequisites

- Node.js 20+
- pnpm (`corepack enable && corepack prepare pnpm@latest --activate`)
- Docker (for local Postgres with pgvector)

### Setup

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:migrate
pnpm dev:backend
```

The API listens on `http://localhost:3000`.

### Auth

Production uses **Supabase Auth** JWTs (`SUPABASE_URL` for JWKS, or `SUPABASE_JWT_SECRET`).

Local dev can bypass auth (already enabled in `.env.example`):

```bash
AUTH_DEV_BYPASS=true
AUTH_DEV_USER_ID=00000000-0000-4000-8000-000000000001
```

Send any `Authorization: Bearer dev` header.

### API (authenticated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/users/me` | Current user profile (auto-provisions on first request) |
| `PATCH` | `/users/me` | Update profile (`displayName`, `timezone`, `checkinTime`) |
| `GET` | `/ventures` | List ventures |
| `POST` | `/ventures` | Create venture |
| `GET` | `/ventures/:id` | Get venture |
| `PATCH` | `/ventures/:id` | Update venture |
| `DELETE` | `/ventures/:id` | Delete venture |
| `GET` | `/ventures/:id/goals` | List goals for a venture |
| `POST` | `/ventures/:id/goals` | Create goal |
| `PATCH` | `/goals/:id` | Update goal |
| `DELETE` | `/goals/:id` | Delete goal |
| `GET` | `/anti-stall/scores` | Urgency scores per venture (anti-stall engine) |

### Monorepo layout

```
apps/backend          NestJS API + Drizzle migrations
apps/mobile           Expo app (ventures + goals screens)
packages/shared-types Shared API/DB TypeScript types
scripts/              Per-phase integration test runner
```

### Mobile app (phase 2)

```bash
cp apps/mobile/.env.example apps/mobile/.env
pnpm dev:mobile
```

Uses `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`) and `EXPO_PUBLIC_AUTH_TOKEN=dev` for local backend auth bypass. On a physical device, point the API URL at your machine's LAN IP.

Screens:
- **Today** — placeholder until daily check-in (phase 6)
- **Ventures** — list, create, edit, delete
- **Goals** — per-venture list, create, edit, delete

### Testing per build phase

Integration tests aligned with the build order in `AGENTS.md`:

```bash
pnpm test:phase:list   # list all phases
pnpm test:phase 1      # run phase 1 only (backend + auth + ventures)
pnpm test:phase        # run all phases (unimplemented phases are skipped)
```

Requires the backend running (`pnpm dev:backend`) and migrations applied. Uses `AUTH_DEV_BYPASS` from `.env` by default (`Authorization: Bearer dev`).

Override via env:

```bash
API_BASE_URL=http://localhost:3000 AUTH_TOKEN=dev pnpm test:phase 1
```
