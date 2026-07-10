# Technical Architecture — Squeaky Wheel (Focus3)

## 1. Stack Recommendation

| Layer | Choice | Why |
|---|---|---|
| Mobile app | **React Native + Expo** | Single codebase for iOS/Android, fast iteration, huge ecosystem, works well with Cursor's code-gen (mainstream TS patterns, lots of training data). |
| Language | TypeScript everywhere (app + backend) | One language across the stack, shared types between client/server. |
| Backend API | **Node.js (NestJS or Fastify)** | Structured, typed, easy to reason about for an AI coding agent; NestJS gives opinionated structure which helps Cursor stay consistent. |
| Primary database | **Postgres** (via Supabase or plain hosted Postgres) | Relational integrity for ventures/tasks/users; Supabase also gives auth + storage out of the box. |
| Vector store | **pgvector extension on the same Postgres** (not a separate vector DB) | Avoids running two databases for an MVP; pgvector is sufficient at this scale (thousands of embeddings per user, not billions). Revisit a dedicated vector DB (Pinecone/Weaviate) only if retrieval latency or scale becomes a real bottleneck. |
| Auth | **Supabase Auth** or **Clerk** | Managed accounts/login, avoids hand-rolling auth for v1. |
| LLM orchestration | **Vercel AI SDK** (`ai` package), called from the backend, never from the client — Claude as the default provider via `@ai-sdk/anthropic` | Provider-agnostic: `generateObject`/`streamText` + tool-calling work the same regardless of which model is behind them, so swapping to OpenAI/Gemini/a different Claude model later is a one-line config change, not a rewrite. Also gives unified streaming and structured-output helpers out of the box. Backend still owns all prompts, context assembly, and tool calls; API keys stay server-side. |
| Calendar integration | **Google Calendar API** first (OAuth2 + Calendar events.insert/list), **Apple EventKit** as iOS-only fast-follow | Google gives a REST API usable from the backend; Apple Calendar sync requires on-device EventKit code in the RN app via a native module. |
| Push/reminders | **Expo Notifications** | Native push without ejecting from Expo managed workflow. |
| Hosting | Backend on **Railway/Fly.io/Render**; Postgres via **Supabase** | Low-ops, good enough for MVP scale. |

## 2. System Components

```
┌─────────────────────────┐
│   Mobile App (Expo/RN)  │
│  - Chat/check-in UI     │
│  - Venture management   │
│  - Daily 3 view         │
└───────────┬─────────────┘
            │ HTTPS/REST (+ WebSocket for chat streaming)
┌───────────▼─────────────┐
│      Backend API        │
│  (NestJS)                │
│  ┌────────────────────┐ │
│  │ Auth module        │ │
│  │ Venture module     │ │
│  │ Task module        │ │
│  │ Checkin module     │ │
│  │ Calendar module    │ │
│  │ Anti-Stall engine  │ │
│  │ LLM Orchestrator   │ │
│  └────────┬───────────┘ │
└───────────┼──────────────┘
            │
   ┌────────┼─────────────────┬───────────────────┐
   ▼                          ▼                    ▼
┌─────────────┐      ┌────────────────┐   ┌────────────────┐
│  Postgres    │      │  Vercel AI SDK  │   │ Google Calendar│
│  + pgvector  │      │  → Claude (or   │   │  API            │
│              │      │  any provider)  │   │                │
└─────────────┘      └────────────────┘   └────────────────┘
```

## 3. Component Responsibilities

### 3.1 LLM Orchestrator
- Built on the **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`, swappable for `@ai-sdk/openai` etc.). The model provider is a single config value (e.g., an env var like `LLM_PROVIDER=anthropic:claude-sonnet`), never hardcoded in business logic — this is the mechanism that lets us change models later without touching the orchestration code.
- Assembles context per request: user profile, active ventures, goals, recent task history, anti-stall scores, calendar availability.
- Retrieves relevant venture context via pgvector similarity search (semantic recall of past notes/goals, not just structured fields) before calling the model.
- Owns the system prompt (see `SYSTEM_PROMPT.md`) and enforces output structure via the AI SDK's `generateObject`/tool-calling helpers (e.g., a `propose_daily_tasks` tool, defined once as a Zod schema, that the model must call with exactly 3 tasks — never free-text parsing). Because the tool schema is defined in AI SDK's provider-agnostic format, it works unchanged across providers.
- Runs two distinct flows:
  1. **Decomposition flow** — goal/venture text → structured task tree (project → epic → micro-task).
  2. **Daily proposal flow** — anti-stall scores + task backlog + calendar availability → 3 proposed tasks + rationale.

### 3.2 Anti-Stall Engine
- Deterministic (non-LLM) scoring service — this should NOT be delegated to the LLM, it's a scheduling/fairness algorithm and needs to be predictable and debuggable.
- Computes, per venture: days since last attention, attention count in rolling 7-day window, configured priority weight, and a computed urgency score.
- Feeds urgency scores into the LLM orchestrator as structured input; the LLM chooses which specific tasks, but the engine decides which ventures are eligible/urgent.

### 3.3 Calendar Module
- OAuth2 flow for Google Calendar, token storage (encrypted at rest).
- Given 3 approved tasks with estimated durations, queries free/busy time and writes calendar events for the day.
- Polls (or uses push notifications/webhooks where available) for external calendar changes to detect if a blocked slot was moved/deleted, and updates task status accordingly.

### 3.4 Checkin Module
- Manages the conversational session state for morning/evening check-ins (a lightweight state machine: proposed → awaiting response → approved/adjusted → committed).
- Persists the conversation transcript for context continuity (so the AI "remembers" today's check-in when the user references it later).

## 4. Data Flow — Daily Alignment Check (happy path)

1. User opens app in the morning → triggers `GET /checkin/today`.
2. Backend: Anti-Stall Engine computes urgency scores for all active ventures.
3. Backend: LLM Orchestrator retrieves relevant venture context (pgvector) + calendar availability, calls Claude with the daily-proposal prompt and urgency scores, forcing a `propose_daily_tasks` tool call returning exactly 3 tasks + rationale.
4. App renders the 3 proposed tasks in chat form with approve/swap/reject actions.
5. User approves (or negotiates — swap one, ask for a different Venture, etc.) via chat; each turn re-invokes the orchestrator with the updated state until the user confirms.
6. On confirm: backend commits the 3 tasks as "today's plan," Calendar Module blocks time for each, Anti-Stall Engine updates attention timestamps for the involved ventures.

## 5. Non-Functional Notes

- **Latency:** LLM calls should stream to the client (WebSocket or SSE) so the chat feels responsive during decomposition/proposal, rather than a multi-second blocking spinner.
- **Cost control:** Cache venture context embeddings; only re-embed on actual edits, not every check-in.
- **Auditability:** Anti-stall engine and task decomposition decisions should be logged (which inputs produced which output) — useful both for debugging and for showing the user *why* a task was proposed, which reinforces trust in the "assertive assistant" framing.
- **Privacy:** Venture data (business goals, deadlines) is sensitive; encrypt at rest, scope all queries by `user_id`, never send other users' data into any single user's context window.
