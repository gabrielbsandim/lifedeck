# Lifedeck V3 plan

The V2 baseline made Lifedeck a life OS you can drive over WhatsApp and the web:
tasks, daily boards, Google Calendar two-way sync, reminders, a multimodal
WhatsApp assistant, billing, and AI metering. V3 turns that reactive assistant
into a **proactive, personal one** — it reaches out, remembers you, keeps you on
your habits, protects your time, and syncs the calendars you actually use.

The thesis: paid retention comes from **daily habit** and from the assistant
**feeling like a real personal assistant**. Every feature below is chosen for
that, and each reuses infrastructure V2 already shipped (the job scheduler, the
proactive-WhatsApp send path, the weather provider, the calendar sync engine, the
streak math, and the `weatherLocation` memory pattern).

## Contents

1. Goals and sequencing
2. What we reuse (V2 backbone)
3. Cross-cutting foundation (V3-0)
4. V3-1 — Assistant memory
5. V3-2 — Proactive messaging foundation
6. V3-3 — Daily proactive brief
7. V3-4 — Proactive nudges
8. V3-5 — Habits & goals with streaks
9. V3-6 — Smart scheduling ("find me time")
10. V3-7 — More calendar providers (Apple + cal.com)
11. Plans, entitlements, and quotas
12. Delivery order and dependency graph
13. Risks and open questions

---

## 1. Goals and sequencing

**Goals**

- Make the assistant **proactive**: a daily brief, habit check-ins, and gentle
  nudges reach the user instead of waiting to be asked.
- Make it **personal**: a durable memory (home, work, people, routines) that
  every feature reads from, seeded by the `weatherLocation` field already shipped.
- Add **standalone daily value**: habit tracking with streaks, and one-line
  "find me time" scheduling.
- **Broaden reach**: Apple (CalDAV) and cal.com behind the existing
  `CalendarProvider` port.

**Non-goals for V3** (unchanged from V2's out-of-scope): team/business plans, the
Expo mobile app (the REST surface stays ready for it), live websockets, and
frontier models in consumer tiers.

**Build order** (one PR-sized phase at a time, in sequence):

```
V3-0  Foundation (entitlements, plan copy, proactive-send + memory scaffolding)
  └─ V3-1  Assistant memory ─────────────┐
       └─ V3-2  Proactive messaging ──────┼─ V3-3  Daily brief
                                          ├─ V3-4  Nudges
                                          └─ V3-5  Habits & check-ins
  V3-6  Smart scheduling (reads memory work-hours)
  V3-7  Calendar providers (independent; can land anytime)
```

---

## 2. What we reuse (V2 backbone)

Grounding every phase in code that already exists keeps V3 cheap and low-risk.

| Need | Already in the repo |
| ---- | ------------------- |
| Periodic sweeps | `runScheduledFanOut()` (container) called hourly by `POST /api/v1/internal/fan-out-jobs`; add new enqueue sweeps here |
| Due-job execution | `makeDispatchDueJobs` handler registry (container `handlers`), drained every 15 min by `/internal/dispatch-jobs`; add new job types here |
| Durable outbox | `ScheduledJob` entity + `ScheduledJobRepository.claimDue` (leased, retried with backoff) |
| Enqueue-by-local-hour | `makeEnqueueDailyDigests` (matches `civilHour(now, tz) === hour`) — the template for the brief/check-in sweeps |
| Proactive WhatsApp send | `makeDeliverReminder`: verified `ChannelIdentity`, `WhatsappSessionWindow.isOpen`, in-session text vs approved template fallback — extract into a shared sender |
| Weather | `WeatherProvider` / `OpenMeteoWeatherProvider` (`getForecast`, `resolveLocation`) |
| Calendar reads | `listCalendarEvents(userId, { from, to })` returning local-zone events |
| Calendar sync engine | `CalendarProvider` port + `CalendarConnection` (multi-account) + rrule mapping + sync jobs |
| Streak math | `get-analytics` (`currentStreak`, `completionRate`) |
| Per-user durable memory | the `weatherLocation` pattern: typed field on `User`, mapped in `user-record`, surfaced in `AssistantContext`, settable via a tool + settings field |
| Agent surface | `AssistantTools` port + `AiSdkAgentRunner` tool registry + system prompt |

---

## 3. Cross-cutting foundation (V3-0)

Shipped first because everything else sits on it.

**Entitlements.** Add to `ENTITLEMENTS` (`packages/domain/src/value-objects/entitlement.ts`):

- `proactiveMessaging` — daily brief, nudges, habit check-ins (any assistant-initiated
  WhatsApp).
- `smartScheduling` — the "find me time" flow.

Map them in `PLAN_CATALOG` (`plan.ts`): `proactiveMessaging` → Pro + Premium;
`smartScheduling` → Premium. Apple/cal.com reuse the existing `calendarSync`
gate but are additionally Premium-only (per the V2 pricing note). Habits and
assistant memory are **baseline** (Free) because they deepen the core loop and
carry no proactive-send cost; only their *proactive check-ins* need
`proactiveMessaging`. Surface all flags through `UserView.entitlements` (already
wired) so the web can gate UI.

**Proactive send is metered.** Assistant-initiated templates cost (~R$0.04 each,
Meta utility) and Gemini calls burn credits. Route every proactive send through
the existing `UsageMeter` and respect a per-user daily cap so a bug can't fan out
hundreds of messages. Record a `proactive` channel on the `UsageEvent` ledger.

**WhatsApp templates.** Out-of-session proactive messages need pre-approved Meta
templates. V3 introduces (names indicative; must be registered + approved in Meta,
and Abracode when that transport is active):

- `daily_brief` — one body param (the composed summary text).
- `habit_checkin` — one param (habit title).
- `nudge` — one param (the suggestion text).

In-session (24h window open) we send free-form text and skip the template. Copy
lives per language via `whatsappLanguageForLocale`, mirroring the reminder template.

**New env / config.** `FEATURE_PROACTIVE` master flag (dark-launchable like the V2
pillars); template names (`WHATSAPP_TEMPLATE_DAILY_BRIEF`, `_HABIT_CHECKIN`,
`_NUDGE`); `PROACTIVE_DAILY_CAP` (default e.g. 4).

**Tests.** Entitlement mapping unit tests; a metering guard test. Keep the 95%
coverage gate green in every phase.

---

## 4. V3-1 — Assistant memory

Generalize the `weatherLocation` field into a small, typed **assistant profile**
the model reads on every turn and writes to when the user shares a durable fact.

**Value / monetization.** This is what makes the assistant feel personal ("you
know I work downtown"). Baseline (Free) because it lifts every other feature and
costs nothing extra; it's also the strongest daily-delight hook into paid
proactive features.

**Domain** (`packages/domain`). Add an `AssistantProfile` value object and a
`User.assistantProfile` field (JSON column, validated on set), holding:

- `homeLocation` / `workLocation` (free-text places; `weatherLocation` folds into
  `homeLocation` or stays a distinct "weather default" — keep `weatherLocation`,
  add the rest).
- `wakeHour` / quiet-hours window (used by the brief and check-ins so we never
  message at night).
- `briefEnabled` + `briefHour` (drives V3-3).
- `people`: a short list of `{ name, relationship }`.
- `notes`: a capped list of freeform strings the model may append ("prefers
  metric", "hates early meetings").

Validation mirrors `weatherLocation` (trim, max lengths, list caps). Getter +
`updateProfile(partial)` / `rememberNote` / `forgetNote` methods.

**Persistence.** `assistant_profile JSONB` on `users` (migration `11_…`);
`user-record` maps it both ways with a safe parse (fall back to empty profile on
malformed JSON, like the timezone fallback).

**Application.** `AssistantContext` gains a compact `memory` summary string.
`AssistantTools` gains `updateAssistantMemory` (structured set/clear) and the
agent reads memory from context. A `setAssistantProfile` use case + DTO powers the
web. Extend `UserView` with `assistantProfile` (update the same fixtures we
touched for `weatherLocation`).

**Infrastructure.** New agent tools + a system-prompt block: "You have a durable
memory of the user; when they share a lasting fact (home, work, family, routine,
preference), save it; use it to personalize answers; never store secrets or
sensitive data." Reuse the untrusted-input guardrail already in the prompt.

**Web.** A "What the assistant remembers" settings card: home/work (with the same
geocode preview we built for weather), wake/quiet hours, people, notes — each
editable and clearable. i18n en/pt/es.

**Tests.** Domain VO (set/trim/clear/caps), record round-trip, use case, tool
wiring (agent-runner is coverage-excluded), hook + settings interactions.

**Effort:** medium.

---

## 5. V3-2 — Proactive messaging foundation

Extract the one proven proactive path so brief/nudge/check-in don't each
re-implement it.

**What.** A shared `sendProactiveMessage(userId, { text, template })` use case
that encapsulates the deliver-reminder logic: resolve verified WhatsApp
`ChannelIdentity`, check `WhatsappSessionWindow.isOpen`, send free-form text when
open else the named template, meter the send, honor quiet hours and the daily cap,
and swallow failures (best-effort, like reminders). `deliver-reminder` is
refactored to call it (behavior unchanged; existing tests stay green).

**Value / monetization.** Pure enabler; the gate is `proactiveMessaging`.

**Infra/App.** New `ProactiveMessenger` shared module in application `shared/`;
container wires it with `messaging`, `channelIdentities`, `whatsappSession`,
`usageMeter`, template config. No new UI.

**Tests.** Window-open text path, window-closed template path, quiet-hours skip,
cap-exceeded skip, unverified-number skip.

**Effort:** small–medium (mostly a careful refactor).

---

## 6. V3-3 — Daily proactive brief

A "bom dia" (and optional "boa noite") WhatsApp message: today's tasks, agenda,
weather for the saved location, what carried over, and reminders.

**Value / monetization.** The single biggest retention hook — it makes Lifedeck a
daily ritual. Anchors **Pro** (`proactiveMessaging`).

**Application.** Mirrors the digest pair:

- `enqueueDailyBriefs` sweep (added to `runScheduledFanOut`): for each entitled,
  opted-in user whose `civilHour(now, tz) === assistantProfile.briefHour`, enqueue
  a `daily-brief` job. Reuses the `enqueueDailyDigests` shape.
- `sendDailyBrief` use case (new `daily-brief` handler in the container registry):
  compose from `getDailyBoard(today)` (pending/among done), `listCalendarEvents`
  for today, `weatherProvider.getForecast(homeLocation, today)`, and the
  carry-over count; render a localized message; deliver via `ProactiveMessenger`.

**Web.** In the memory/preferences card: brief on/off + time picker (writes
`briefEnabled`/`briefHour`). Optional evening-summary toggle.

**Tests.** Sweep hour-matching + entitlement filter; compose with/without
calendar or weather; delivery via a fake messenger. Reuse the digest tests as a
template.

**Effort:** medium. Depends on V3-1 (brief time + home location) and V3-2.

---

## 7. V3-4 — Proactive nudges

The assistant notices patterns and reaches out with a single, actionable
suggestion the user can accept by replying.

**Value / monetization.** The clearest "real assistant" signal. Anchors
**Premium**.

**Application.** A daily `scanNudges` sweep (evening, quiet-hours-aware) inspects
cheap signals already in the data:

- a task carried over / pending N days in a row → "You've moved 'call the
  dentist' 3 days running — want me to schedule it tomorrow at 10?"
- tomorrow has an early event with no prep task, streak about to break, etc.

Each finding enqueues a `nudge` job → `sendNudge` composes a one-liner via
`ProactiveMessenger`. The reply lands in the normal inbound flow and the agent
acts (it already has the task/calendar tools). Start with **one or two** rules,
strictly rate-limited (≤1 nudge/day), tuned before adding more.

**Data.** Reuse recurring-task/carry-over history and `get-analytics`. A tiny
`nudge_log` (userId, rule, date) prevents repeats.

**Tests.** Rule detection given seeded history; rate-limit; quiet-hours skip.

**Effort:** medium. Depends on V3-2 (and reads V3-1).

---

## 8. V3-5 — Habits & goals with streaks

First-class habits the assistant tracks and checks in on, reusing the streak math.

**Value / monetization.** High daily engagement and a natural upsell. Habit
CRUD + streaks are **Pro**; proactive check-ins need `proactiveMessaging` (Pro+).
Free gets a taste (e.g. one habit, no proactive check-in).

**Domain.** `Habit` (title, cadence — `daily` or `timesPerWeek:N` or specific
weekdays, optional `checkinTime`, active flag) and `HabitLog` (habitId, civil
date, done). Streak/consistency computed with the same approach as
`get-analytics` (walk civil days back while satisfied).

**Persistence.** `habits` + `habit_logs` tables (migration), repositories +
Prisma adapters (both are coverage-excluded like the other prisma repos, but the
domain/use-cases are tested).

**Application.** CRUD use cases + `logHabit` / `getHabits` / streak summary.
`AssistantTools` gains `addHabit`, `logHabit`, `getHabits` so WhatsApp drives it
("done with the gym today", "how's my reading streak?"). A `habit-checkin` sweep
enqueues at each habit's `checkinTime` → `sendHabitCheckin` via
`ProactiveMessenger` ("Did you meditate today?"); the reply logs it through the
agent.

**Web.** A Habits screen (list, streaks, quick log) + creation form; entitlement-
gated with an upsell for Free.

**Tests.** Domain cadence + streak edge cases (gaps, timezone day boundaries),
use cases, tools, sweep, web hooks/screen.

**Effort:** medium–high (new domain + tables + a screen).

---

## 9. V3-6 — Smart scheduling ("find me time")

"Reserve an hour of deep work this week" → the assistant finds a real free slot
and books it.

**Value / monetization.** A concrete premium capability. Anchors **Premium**
(`smartScheduling`).

**Application.** `findFreeSlots(userId, { durationMin, from, to, workHours })`:
pull `listCalendarEvents` for the window, subtract busy intervals, constrain to
the user's work hours / quiet hours from `assistantProfile`, return candidate
slots. `scheduleFocusBlock` books one via the existing `addEvent`.
`AssistantTools` gains `findTime`; the agent proposes a slot, confirms, then adds
the event (reusing `addEvent` with a reminder). Also a small web "Find time"
action in the calendar.

**Tests.** Slot math (adjacent/overlapping/all-day events, work-hour clipping,
across days, none-available), tool + agent path, entitlement gate.

**Effort:** medium. Reads V3-1 (work hours); otherwise self-contained.

---

## 10. V3-7 — More calendar providers (Apple + cal.com)

Extend reach behind the existing `CalendarProvider` port — no new sync engine.

**Value / monetization.** Unlocks non-Google users; **Premium** per the V2
pricing note, under the `calendarSync` gate.

**Domain.** Add `'apple'` and `'calcom'` to `CALENDAR_PROVIDERS`. The
`CalendarConnection` model, sync jobs, rrule mapping, and reconcile/renew sweeps
are already provider-agnostic.

**Infrastructure.** Two new adapters implementing `CalendarProvider`:

- **Apple (CalDAV/iCloud)**: app-specific-password auth (not OAuth), CalDAV
  REPORT for changes, `.ics` PUT/DELETE for push. `exchangeCode`/`watch` adapt to
  CalDAV's model (no Google-style push channels → rely on the periodic reconcile
  sweep; `watch` becomes a no-op that returns no channel).
- **cal.com**: API-key/OAuth per their API; map bookings/events to
  `ExternalCalendarEvent`.

**API / UI.** Extend the connections settings to add Apple/cal.com (the multi-
connection UI already exists); provider-specific connect forms (Apple needs an
app-specific password field). Container registers the new adapters by provider
name.

**Tests.** Adapter mapping (external ↔ domain, recurrence, deletions/overrides)
with mocked HTTP; connection flow. Prisma bits stay coverage-excluded.

**Effort:** high (external protocols, especially CalDAV). Independent of the
proactive stack — can land in parallel or last.

---

## 11. Plans, entitlements, and quotas

| Capability | Free | Pro | Premium |
| ---------- | ---- | --- | ------- |
| Assistant memory | ✅ | ✅ | ✅ |
| Habits + streaks (manual) | 1 habit | ✅ | ✅ |
| Daily brief | — | ✅ | ✅ |
| Habit check-ins (proactive) | — | ✅ | ✅ |
| Nudges | — | — | ✅ |
| Smart scheduling | — | — | ✅ |
| Apple / cal.com sync | — | — | ✅ |

New entitlements: `proactiveMessaging` (Pro+), `smartScheduling` (Premium).
Existing `calendarSync` gates the new providers; the Premium-only restriction is
enforced in the connect flow.

**Quota impact.** Proactive sends consume credits and (out of session) a paid
template. Keep them inside the existing weekly credit budget, add a
`PROACTIVE_DAILY_CAP`, and count them on the `UsageEvent` ledger so the margin
math in the V2 pricing section still holds (a daily brief + occasional check-in is
~R$1–2/user/month, comfortably inside Pro's net revenue).

---

## 12. Delivery order and dependency graph

1. **V3-0 Foundation** — entitlements, plan copy, template config, metering hook.
2. **V3-1 Assistant memory** — the profile everything reads.
3. **V3-2 Proactive messaging** — the shared sender (refactor from reminders).
4. **V3-3 Daily brief** — first proactive payoff (needs 1 + 2).
5. **V3-5 Habits & check-ins** — new domain; check-ins need 2.
6. **V3-4 Nudges** — needs 2; tune after brief/habits exist.
7. **V3-6 Smart scheduling** — reads 1; otherwise standalone.
8. **V3-7 Calendar providers** — independent; schedule anytime.

Each phase is one reviewable PR, ships behind `FEATURE_PROACTIVE` (or the calendar
flag) so it can sit in `main` dark until enabled, and keeps the 95% coverage gate
green.

---

## 13. Risks and open questions

- **Meta template approval** is the critical-path external dependency for
  out-of-session proactive messages. Mitigation: in-session text works day one;
  templates unlock the rest. Submit `daily_brief`/`habit_checkin`/`nudge` early.
- **Proactive fatigue / spend.** Hard per-user daily cap, quiet hours, and easy
  opt-out per feature. Start nudges with one rule.
- **Timezone correctness** for briefs/check-ins — reuse `civilHour`/`civilDate`
  exactly as the digest sweep does; test day boundaries.
- **CalDAV variance** across iCloud/others is the biggest unknown in V3-7; keep it
  last and behind the flag.
- **Privacy of memory** — never store secrets/health/financial data; make memory
  fully user-visible and clearable in settings (it is).
