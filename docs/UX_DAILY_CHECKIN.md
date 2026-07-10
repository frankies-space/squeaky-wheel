# UX Wireframe Description — Daily Alignment Check

This describes the screen-by-screen flow for the core interaction of the app: the morning (and optional evening) conversational check-in. This is a chat-first flow, not a form or board — describe it to Cursor as a single scrollable chat screen with a few structured "cards" rendered inline, not separate screens per step.

## Screen: Daily Check-In (Chat)

**Layout (single screen, chat-style, top to bottom):**

```
┌─────────────────────────────────┐
│  ← Focus3          [Wed, Jul 10]│  <- header: date, no hamburger menu/clutter
├─────────────────────────────────┤
│                                  │
│  🤖 Good morning. Here's what   │  <- assistant message bubble (left-aligned)
│  I'm proposing for today:       │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 1. Ship pricing page copy │  │  <- Task Card 1
│  │    Venture: Acme SaaS     │  │
│  │    ~45 min · 10:00-10:45  │  │
│  │    "Hasn't had attention  │  │
│  │     in 3 days"            │  │  <- rationale, small/muted text
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 2. Record podcast intro   │  │  <- Task Card 2
│  │    Venture: Podcast Co    │  │
│  │    ~30 min · 13:00-13:30  │  │
│  │    "Keeps weekly momentum"│  │
│  └───────────────────────────┘  │
│                                  │
│  ┌───────────────────────────┐  │
│  │ 3. Reply to investor email│  │  <- Task Card 3
│  │    Venture: Fundraise     │  │
│  │    ~20 min · 16:00-16:20  │  │
│  │    "Deadline in 2 days"   │  │
│  └───────────────────────────┘  │
│                                  │
│  [ ✅ Looks good ]  [ ✏️ Adjust ]│  <- primary actions, always visible
│                                  │
├─────────────────────────────────┤
│  Type a message...        [🎤]  │  <- text input + voice (v1.1)
└─────────────────────────────────┘
```

### States & Interactions

**1. Proposal state (default on open)**
- Exactly 3 task cards render, always numbered 1–3, never more.
- Each card shows: task title, venture name (as a small colored tag, one color per venture for quick visual scanning), estimated time + proposed calendar slot, and the one-line rationale in muted/secondary text.
- Two persistent action buttons below the cards: **"Looks good"** (primary, confirms as-is) and **"Adjust"** (secondary, opens the conversational edit path).

**2. Adjust / negotiate state**
- Tapping "Adjust" doesn't open a modal or new screen — it focuses the text input and the assistant sends a short prompt bubble: *"Sure — want me to swap one out, or is something off with the timing?"*
- User can type free text ("swap #2 for something on the marketing venture instead") or tap a task card directly to get inline actions: **Swap**, **Skip today**, **Change time**.
- Assistant responds by re-rendering the affected card(s) in place (not the whole list) with a brief transition, plus an updated one-line rationale if the swap affects anti-stall balance (e.g., *"Heads up — Podcast Co will then go 4 days without attention."*).
- User keeps negotiating conversationally until satisfied, then taps "Looks good."

**3. Confirmed state**
- On confirm, cards visually "lock" (subtle checkmark, cards become non-editable but still visible), assistant sends a short closing message: *"Locked in. I've blocked time on your calendar for all 3."*
- A small calendar icon appears on each card once the time block is created, confirming the write succeeded (or a warning icon + inline retry if the calendar write failed).
- Below the locked cards, the screen effectively becomes read-only for the rest of the day — this is the anti-over-scheduling mechanism. There is no "+ Add task" button on this screen, by design.

**4. Evening check-in (optional, v1.1)**
- Same screen pattern, opened via a gentle evening notification.
- Assistant asks per task: done / not done / partially — via quick-tap chips under each card rather than free text, to keep it under 30 seconds.
- Not-done tasks get a one-tap "push to tomorrow" or "back to backlog" action; outcomes feed the `outcome` field on `daily_plan_tasks` and the anti-stall log.

### Secondary Screens (reachable, but never the default landing screen)

- **Ventures list** — simple list of venture cards (name, status, days-since-attention indicator), reachable via a tab/icon, not the home screen. Used for setup/editing, not daily use.
- **Backlog / Later view** — de-emphasized list of tasks not currently in the daily 3; explicitly styled as low-salience (smaller text, muted colors) so it doesn't compete with the daily check-in for attention.

### Design Principles to Enforce in Implementation

- The home/landing screen is **always** the check-in chat, never a dashboard or list — reinforces "the AI drives, you approve."
- Never render a 4th task card in the daily plan UI under any state, including "Adjust" — enforce this in the component layer in addition to the DB constraint.
- Rationale text is always visible, not hidden behind a tap — the anti-stall logic needs to be legible to build user trust, not feel arbitrary.
- Keep the confirm action always reachable without scrolling (sticky footer buttons) — the whole interaction should be completable in under 2 minutes.
