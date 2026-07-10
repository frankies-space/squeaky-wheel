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

### Monorepo layout

```
apps/backend          NestJS API + Drizzle migrations
packages/shared-types Shared API/DB TypeScript types
```
