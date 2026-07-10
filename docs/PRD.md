# Product Requirements Document — Squeaky Wheel (Focus3)

## 1. Vision & Problem Statement

Traditional to-do list apps optimize for capturing everything a user *could* do, which for high-agency entrepreneurs running multiple ventures produces over-planning, guilt, and decision fatigue. The user doesn't need another list — they need an AI Executive Assistant that actively manages their time, balances cognitive load across ventures, and enforces a hard constraint: **the Rule of 3** (3 essential tasks a day = a successful day).

The app's job is to bring mental peace by removing planning friction, not by adding another surface to manage.

## 2. Target User

**Persona: The Multi-Venture Founder**

- Runs 2–6 active businesses/projects simultaneously.
- Has ADHD or ADHD-like planning friction: strong at ideation and execution in the moment, weak at sustained prioritization and follow-through across many threads.
- Dislikes traditional to-do apps — perceives them as guilt machines (long lists, red overdue counters, no sense of "done for today").
- Wants every venture to keep moving even if attention is naturally uneven day to day ("never let one venture stall").
- Values a system that tells them what to do, rather than one that expects them to figure it out.

## 3. Core Product Principles

1. **Constraint over capacity.** The system's value is in saying no to task #4, not in fitting more in.
2. **Proactive, not passive.** The AI proposes; the user approves/adjusts. The default direction of work is AI → user, not user → AI.
3. **Momentum across ventures, not urgency within one.** Success is measured by rolling attention across all ventures, not by clearing any single backlog.
4. **Conversation as the primary interface for planning.** Task entry and breakdown happen in the background; the user's daily touchpoint is a short conversational check-in, not a board or list view.

## 4. Core Functional Requirements

### 4.1 Multi-Venture Knowledge Base
- User can create/edit **Ventures** (businesses/projects), each with: name, description, long-term goals, deadlines, and current priorities.
- Free-text and structured input both supported (quick-add now, richer context later).
- This data forms the persistent context the AI reasons over — not a task list the user maintains manually.

### 4.2 Proactive Task Generation
- Given a venture's goals/deadlines, the AI decomposes them into projects → epics → micro-tasks (small enough to complete in a single sitting, target 15–90 min).
- Decomposition runs automatically when a goal is added/changed and periodically as deadlines approach.
- User can review/edit AI-generated breakdowns but is not required to for the system to function.

### 4.3 The Anti-Stall Algorithm
- Tracks a rolling attention window (default: 7 days) per venture: how recently and how often each venture has appeared in the user's daily 3.
- When proposing the daily 3, the algorithm penalizes ventures that have been under-attended relative to their declared priority/weight, and never lets a venture go longer than a configurable max (default: 3 days) without at least one task, unless the user explicitly pauses that venture.
- Venture priority weights are user-configurable (not all ventures deserve equal share of attention).

### 4.4 Daily Alignment Check (Co-Piloting)
- Morning and/or evening conversational check-in (chat, voice optional in MVP+1).
- AI proposes exactly 3 essential tasks, with a one-line rationale referencing anti-stall balance ("Venture X hasn't had attention in 3 days").
- User can approve as-is, swap a task, or reject and ask for alternatives — in natural conversation, not a form.
- Evening check-in (optional) reviews what got done, reschedules what didn't, and feeds outcomes back into the anti-stall model.

### 4.5 Strict Constraint Enforcement
- The daily view is hard-locked to 3 primary tasks. No UI path to add a 4th primary task for the day.
- Secondary/backlog tasks may exist in a de-emphasized "later" view, but are never mixed into the daily 3 surface.

### 4.6 Calendar Integration (Bi-directional)
- Once the daily 3 are approved, the AI finds real open slots on the user's calendar and blocks time automatically.
- Bi-directional: if the user moves/deletes a calendar block, the app detects this and reflects it in task status (rescheduled, not done).

## 5. Key User Stories

- As a founder with 4 ventures, I want the app to notice that Venture C hasn't been touched in days, so it gets surfaced in tomorrow's 3 without me having to remember it myself.
- As a user, I want to open the app once in the morning, approve or tweak 3 tasks in under 2 minutes, and not look at a task list again until tomorrow.
- As a user, I want big fuzzy goals ("grow the newsletter") to turn into a concrete next action without me having to break it down myself.
- As a user, I want my calendar to actually reflect my day so the 3 tasks aren't just intentions — they're blocked time.
- As a user, I never want to see more than 3 primary tasks for today, no matter how much I've added to the system.

## 6. MVP Scope

**In scope for v1:**
- Venture CRUD + goal/deadline input.
- AI task decomposition (text-based, on-demand + triggered by goal changes).
- Anti-stall scoring and daily-3 proposal (chat-based check-in, morning only).
- Approve/swap/reject flow in chat.
- One-way calendar write (block time for approved tasks); Google Calendar first.
- Accounts/login (single user per account in v1 — no team features).

**Explicitly out of scope for v1:**
- Voice check-ins (design for it, ship chat-only first).
- Bi-directional calendar sync (start with write-only; read-conflict detection in v1.1).
- Multi-user/shared ventures, delegation.
- Native notifications beyond a daily check-in reminder.

## 7. Success Metrics

- % of days where the user completes a daily check-in.
- % of proposed daily-3 tasks approved without edits (proxy for AI proposal quality).
- Rolling attention variance across ventures (lower = anti-stall working).
- Task completion rate for the daily 3 specifically (should be meaningfully higher than historical to-do-list completion rates).

## 8. Risks / Open Questions

- Task decomposition quality depends heavily on how much context the user provides per venture — needs a good empty-state/onboarding flow to seed enough context.
- Anti-stall algorithm needs sensible defaults (weights, max-days-without-attention) that won't feel arbitrary to the user; should be visible/explainable, not a black box.
- Calendar write access requires OAuth consent flows — plan for Google first, Apple Calendar (EventKit, iOS-only) as fast-follow.
