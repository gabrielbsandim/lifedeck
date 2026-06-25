# Lifedeck V2 plan

Status: **planning**. This document is the master plan for Lifedeck V2. It is a
design and roadmap document, not yet implemented. V1 stays the shipped product;
V2 lands incrementally on `main` behind feature flags so V1 bugfixes and
improvements continue uninterrupted.

V2 turns Lifedeck from a daily life-organization app into "your whole life in the
palm of your hand": a calendar you actually live in, and an AI assistant on
WhatsApp that can do everything the app can do plus answer anything, by text,
voice, or photo.

## Contents

1. [Goals and non-goals](#1-goals-and-non-goals)
2. [Guiding principles](#2-guiding-principles)
3. [The three pillars](#3-the-three-pillars)
4. [Where the code lives](#4-where-the-code-lives)
5. [Cross-cutting foundation](#5-cross-cutting-foundation)
6. [Pillar A: calendar and scheduling](#6-pillar-a-calendar-and-scheduling)
7. [Pillar B: WhatsApp AI assistant](#7-pillar-b-whatsapp-ai-assistant)
8. [Plans, pricing, and quotas](#8-plans-pricing-and-quotas)
9. [Security, privacy, and compliance](#9-security-privacy-and-compliance)
10. [New environment variables](#10-new-environment-variables)
11. [Implementation phases](#11-implementation-phases)
12. [Risks and open questions](#12-risks-and-open-questions)
13. [Out of scope](#13-out-of-scope)

---

## 1. Goals and non-goals

### Goals

- **Calendar integration**: connect Google Calendar (Apple and cal.com later),
  with events, reminders, and proactive alerts. Two-way sync with Google.
- **WhatsApp AI assistant**: control everything in the system from WhatsApp
  (create, edit, delete tasks, lists, events), receive alerts there, and ask the
  AI anything (about the system or not), by text, audio, or image.
- **Monetization**: Free, Pro, and Premium plans with AI usage limits modeled on
  rolling windows (a 5-hour window plus a weekly window, like Claude), enforced
  with cost-weighted credits.
- **Keep V1 shippable**: V2 code can live in `main` while staying invisible in
  production. No long-lived branch.
- **Hold the line on quality**: clean architecture, 95% coverage gate per
  package, white-label REST API, OpenAPI from Zod, no inline comments, intent in
  `docs/`. This is a portfolio project; the bar is "good enough to show".

### Non-goals (for V2)

- Business or team plans. Deliberately dropped: Lifedeck is a personal
  life-organization product, not a work project-management tool.
- A Family/Couple shared plan. On-brand and likely a future addition, but not in
  the V2 launch scope.
- The mobile app (Expo). Still future, per `DEVELOPMENT_PLAN.md` Phase 13. The
  V2 REST surface is designed so the mobile client can consume it later unchanged.
- Live websocket push. The 10s polling stays; proactive delivery for V2 happens
  over WhatsApp and email, not a socket.

---

## 2. Guiding principles

1. **Trunk-based with flags, never a V2 branch.** Every V2 slice merges to `main`
   behind a feature flag and/or a plan entitlement, so a V1 bugfix never conflicts
   with a half-built feature. Each slice is independently shippable and ends green.

2. **Extend the layers, do not add feature packages.** Lifedeck's architecture is
   organized by clean-architecture layer (`@lifedeck/domain`,
   `@lifedeck/application`, `@lifedeck/infrastructure`), not by feature. V2 adds
   new entities, ports, use cases, and adapters inside those existing packages.
   The dependency rule already enforces the boundaries; inventing
   `@lifedeck/calendar` would fragment the model for no gain. See
   [docs/architecture.md](./architecture.md).

3. **Reuse use cases, do not reimplement them.** The WhatsApp agent's "tools" are
   thin wrappers over the existing application use cases (`makeCreateTask`,
   `makeGetDailyBoard`, and the new calendar ones). The composition root
   (`apps/web/src/server/container.ts`) stays the single wiring point. This is
   exactly why personal API keys were chosen in Phase 10: first-party integrations
   acting as the user.

4. **Cost-aware by construction.** Every AI call is metered. Limits are sized so a
   user at the ceiling of any plan still costs less than the post-fee revenue of
   that plan. The cheap model (Gemini Flash) is the default everywhere; the costlier
   model (Gemini 3.1 Pro) is gated and credit-weighted.

5. **Same delivery contract as V1.** Every feature ships with tests, docs, an
   OpenAPI entry if it is an API, and a responsiveness pass if it is UI. Migrations
   reach production via the Migrate CI workflow on push (next number is `9_`).

---

## 3. The three pillars

| Pillar | What it delivers | New infra it forces |
| ------ | ---------------- | ------------------- |
| **A. Calendar and scheduling** | Events, reminders, proactive alerts, two-way Google sync | A real job scheduler (the app has no cron/queue today) |
| **B. WhatsApp AI assistant** | Full system control plus general AI over WhatsApp, multimodal | Inbound webhook, an agent runner, media handling |
| **Foundation (cross-cutting)** | Entitlements, feature flags, billing, AI metering | The backbone that connects flags, plans, and limits |

The foundation is built first because it gates everything: it is what lets V2 code
sit in production invisibly, and what makes the AI features safe to expose.

Dependency order:

```
Foundation (entitlements + flags)
      │
      ├──► Scheduling infra (due-queue + QStash)
      │          │
      │          ▼
      │     Pillar A (calendar + Google sync + reminders)
      │
      ├──► Billing + plans (Stripe)
      │
      └──► AI metering (credits) ──► Pillar B (WhatsApp agent)
```

---

## 4. Where the code lives

V2 adds modules to the existing layered packages. Indicative layout:

```
packages/domain/src/
  entities/          + calendar-event.ts, reminder.ts, calendar-connection.ts,
                       subscription.ts, channel-identity.ts, usage-window.ts
  value-objects/     + plan.ts, entitlement.ts, reminder-offset.ts,
                       credit-cost.ts, message-channel.ts

packages/application/src/
  ports/             + calendar-provider.ts, calendar-event-repository.ts,
                       reminder-repository.ts, calendar-connection-repository.ts,
                       job-queue.ts, scheduled-job-repository.ts,
                       subscription-repository.ts, payment-gateway.ts,
                       entitlement-service.ts, usage-meter.ts,
                       messaging-channel.ts, transcriber.ts, vision-reader.ts,
                       agent-runner.ts, conversation-store.ts, weather-provider.ts
  use-cases/         + calendar: create/update/delete-event, sync-google-calendar,
                       schedule-reminder, dispatch-due-jobs
                       billing: start-checkout, handle-subscription-webhook,
                       get-entitlements, change-plan, cancel-subscription
                       metering: consume-credits, get-usage
                       messaging: link-whatsapp-number, handle-inbound-message,
                       send-proactive-alert

packages/infrastructure/src/
  calendar/          + google-calendar-provider.ts (later: apple, calcom)
  scheduling/        + qstash-job-queue.ts, prisma-scheduled-job-repository.ts
  billing/           + asaas-payment-gateway.ts (BR), stripe-payment-gateway.ts (intl),
                       prisma-subscription-repository.ts
  metering/          + redis-usage-meter.ts (Upstash) + prisma usage ledger
  messaging/         + whatsapp-cloud-channel.ts, gemini-transcriber.ts,
                       gemini-vision-reader.ts, ai-sdk-agent-runner.ts,
                       redis-conversation-store.ts
  entitlements/      + plan-entitlement-service.ts
  prisma/            + migrations 9_… onward; new models below

apps/web/src/
  app/api/v1/        + calendar/*, billing/*, webhooks/whatsapp,
                       webhooks/stripe, webhooks/google, internal/dispatch-jobs
  app/(new screens)  + calendar, settings/integrations, settings/billing
  server/            container wires every new adapter; feature-flag + entitlement
                       guards added alongside requireScope
```

New Prisma models (snake_case tables via `@@map`, PascalCase models):

- `Plan` is **config, not a table** (a value object / typed constant), so plan
  definitions are versioned in code and reviewed in PRs.
- `Subscription` (userId, plan, status, currentPeriodEnd, provider refs).
- `UsageEvent` (userId, window keys, creditCost, model, channel, createdAt) - the
  durable ledger; fast counters live in Redis.
- `CalendarConnection` (userId, provider, encrypted tokens, syncToken, channelId,
  expiresAt).
- `CalendarEvent` (userId, title, start, end, allDay, location, recurrenceRule,
  source, externalId, externalEtag).
- `Reminder` (eventId, offsetMinutes, channel, status).
- `ScheduledJob` (runAt, type, payloadJson, status, attempts) - the due-queue
  outbox.
- `ChannelIdentity` (userId, channel, address E.164, verifiedAt) - links a
  WhatsApp number to an account.

---

## 5. Cross-cutting foundation

### 5.1 Entitlements and feature flags

The backbone that makes "code in `main`, hidden in production" work, and the same
mechanism that gates paid features.

Two independent layers:

- **Feature flag (global, env-driven).** `FEATURES_V2`, `FEATURE_CALENDAR`,
  `FEATURE_WHATSAPP`, `FEATURE_BILLING`. Off in production, on in preview and
  local. A pillar that is flagged off is invisible everywhere, regardless of plan.
- **Entitlement (per user, plan-driven).** Even when a feature is globally on, a
  capability only appears for a user whose plan grants it. Derived from the user's
  `Subscription` plus the `Plan` config. Exposed as `EntitlementService` (a port)
  and surfaced to the client in `UserView` (e.g. `entitlements: { calendarSync:
  true, whatsappAssistant: false, premiumModel: false }`).

UI consumption: the hardcoded nav in `app-sidebar.tsx` becomes a filtered list.
An item is shown when its feature flag is on and the user is entitled; an item
the user is not entitled to can either be hidden or shown `disabled` with an "Em
breve" / upsell badge (per-item decision). API consumption: a `requireFeature` +
`requireEntitlement` guard sits alongside the existing `requireScope` in the
route handlers.

Server-side flag resolution must be SSR-safe (no hydration flash), mirroring the
locale resolution already used for i18n.

### 5.2 Billing and subscriptions (Asaas in Brazil, Stripe internationally)

Two gateways behind one port, routed by market. **Asaas for Brazil**, because it
gives native Pix (Stripe Pix in Brazil is invite-only), boleto, and automatic
NF-e issuance (a legal obligation for the operating company, GBS Tecnologia), at
card fees lower than Stripe's. **Stripe for international (USD)**, where it is the
strongest option. Both are built at launch; the `PaymentGateway` port absorbs the
difference so the use cases never know which gateway served a charge.

- Domain: `Subscription` entity (`status`: active / past_due / canceled / trialing;
  `plan`; `currentPeriodEnd`; `provider` and provider refs). `Plan` value object
  holds the catalog (price/product refs per gateway and currency, the entitlements
  it grants, the quota config).
- Ports: `PaymentGateway` (start checkout, open billing/management, parse webhook),
  `SubscriptionRepository`.
- Routing: the user's market (BRL vs other) selects the gateway at checkout. A
  given user's subscription stays on the gateway it was created on; routing is
  decided once, not per charge.
- Infra: `AsaasPaymentGateway` (BR: Pix, card, boleto, NF-e automation) and
  `StripePaymentGateway` (international: Stripe Checkout + Billing Portal). Each has
  its own signed webhook (`/api/v1/webhooks/asaas`, `/api/v1/webhooks/stripe`) as
  the **source of truth** for subscription state; the client redirect is never
  trusted.
- Pricing levers baked in: annual plans (two months free) are surfaced first,
  because the gateways' fixed per-transaction fees make low-ticket monthly the most
  expensive path (Asaas Pix is a flat ~R$1.99, Stripe card ~R$0.39). Annual dilutes
  the fixed fee to ~1-3%. See [Plans](#8-plans-pricing-and-quotas).
- Webhook idempotency: each handler dedupes on its provider's event id; subscription
  writes are idempotent. Both webhooks get their own Upstash rate limiter.

### 5.3 AI metering (cost-weighted credits)

Models the "5 hours and weekly, like Claude" requirement.

- **Unit**: an internal **credit**, weighted by real cost, shown to the user as
  "interactions". Weighting (anchored to the cost research, ~R$5.5/USD):

  | Action | Approx cost | Credits |
  | ------ | ----------- | ------- |
  | Flash text interaction | ~R$0.03 | 1 |
  | Flash + audio (transcription) | ~R$0.03 + cents | 2 |
  | Flash + image/vision | ~R$0.03 + a little | 2 |
  | Gemini 3.1 Pro interaction | ~R$0.18 | 6 |

  Weighting by cost (not by raw message count) keeps the limit fair: an audio +
  Pro request does not cost the same as a one-word "oi".

- **Two rolling windows, both must pass**: a rolling 5-hour window (resets
  continuously, like Claude) and a rolling 7-day window. A request is allowed only
  if it fits under both remaining budgets.
- **Storage**: fast counters in Upstash Redis (already a dependency), keyed by
  `userId` + window; a durable `UsageEvent` ledger in Postgres for billing,
  auditing, and analytics. Redis is the gate; Postgres is the truth.
- **Enforcement**: `UsageMeter.check(userId, creditCost)` runs at the entry of the
  agent runner and the existing `/lists/generate` endpoint (closing the Phase 6.5
  "per-plan generation quotas" TODO). On exhaustion the agent replies on WhatsApp
  with a friendly reset time ("seu limite reseta às 14h"), mirroring Claude's UX.
- **Per-plan config** lives on the `Plan` value object, not hardcoded.

### 5.4 Scheduling infrastructure

The piece the app lacks today (the daily digest is a manual trigger). Required for
reminders, proactive WhatsApp alerts, calendar sync polling, and the now-automatic
daily digest.

- **Outbox table** `ScheduledJob` (`runAt`, `type`, `payloadJson`, `status`,
  `attempts`). Writing a job is part of the same `UnitOfWork` transaction as the
  action that schedules it (e.g. creating an event also enqueues its reminders).
- **Driver**: Upstash QStash (same vendor as the Redis already in use) calls a
  protected `/api/v1/internal/dispatch-jobs` endpoint on a cadence; the handler
  drains due jobs, dispatches each by `type`, and applies retry/backoff. QStash
  also handles native scheduling for the recurring sync poll and digest.
- Port `JobQueue` (enqueue, enqueueAt) + `ScheduledJobRepository`; infra
  `QStashJobQueue`. Vercel Cron is the fallback driver if QStash is not configured
  (graceful no-op, mirroring the Upstash rate-limit pattern).
- The dispatch endpoint is authenticated (QStash signature verification) and
  idempotent per job id.

---

## 6. Pillar A: calendar and scheduling

### 6.1 Domain

- `CalendarEvent` entity: `title`, `start`, `end`, `allDay`, `location`,
  `notes`, an optional `RecurrenceRule` (reuse the existing V1 value object, no new
  recurrence engine), `source` (`lifedeck` | `google`), `externalId`,
  `externalEtag`. Invariants: `end >= start`; all-day events normalize to civil
  days in the user's timezone (the per-user IANA timezone already exists from
  Phase 12.6).
- `Reminder` entity: `eventId`, `ReminderOffset` value object (minutes before
  start), `channel` (`push` | `email` | `whatsapp`), `status`.
- `CalendarConnection` entity: `provider`, sync cursor (`syncToken`), push
  `channelId`, token expiry. Tokens themselves are stored encrypted in
  infrastructure, never in the domain object.

### 6.2 Application

- Use cases: `createEvent`, `updateEvent`, `deleteEvent`, `listEvents` (range
  query), `scheduleReminder`, `connectGoogleCalendar`, `syncGoogleCalendar`,
  `dispatchDueJobs`.
- Ports: `CalendarProvider` (the sync abstraction), `CalendarEventRepository`,
  `ReminderRepository`, `CalendarConnectionRepository`.
- Multi-write flows (create event + enqueue its reminders; sync batch apply) run
  inside `unitOfWork.run(...)`, consistent with the existing transaction strategy.

### 6.3 Infrastructure: Google sync

- `GoogleCalendarProvider` implements `CalendarProvider`. Lifedeck is the source
  of record; Google is a synced mirror.
- **Auth**: incremental OAuth. The Phase 3 `GoogleOAuthProvider` covers sign-in
  scopes only; calendar needs the Calendar scopes plus a refresh token (offline
  access). A separate consent step on the integrations screen, with refresh tokens
  stored encrypted in `CalendarConnection`.
- **Inbound sync**: Google push notifications (watch channels) hit
  `/api/v1/webhooks/google`; the handler enqueues an incremental sync job. The job
  pulls changes via the stored `syncToken` and applies them, deduped by
  `externalId`. A periodic full reconcile (via QStash) catches missed
  notifications and channel expiry (channels must be renewed).
- **Outbound sync**: events created or edited in Lifedeck are pushed to Google in
  the same flow.
- **Conflict resolution**: last-write-wins by most recent update timestamp,
  deduped by `externalId` + `externalEtag` to avoid echo loops (a change we just
  pushed must not re-import as a remote change).
- Apple (CalDAV) and cal.com are later providers behind the same port, no rework.

### 6.4 API and UI

- REST: `/api/v1/calendar/events` (CRUD + range list), `/api/v1/calendar/connect`
  (start Google consent), `/api/v1/webhooks/google`. Each with an OpenAPI entry
  and scopes (`calendar:read`, `calendar:write`).
- UI: a calendar screen (month/week/day), an integrations settings screen
  (connect/disconnect Google, sync status), and reminder configuration on the
  event editor. Responsive-first, reduced-motion aware, like the rest of the app.

### 6.5 Reminders and alerts

Creating an event with a reminder enqueues a `ScheduledJob` at `start - offset`.
When it fires, `dispatchDueJobs` routes by channel: web/push, email (Resend,
already wired), or WhatsApp (Pillar B, a proactive template). The same scheduler
makes the daily digest automatic, closing the Phase 9 "scheduled delivery" TODO.

---

## 7. Pillar B: WhatsApp AI assistant

Conceptually an agent with tool-calling running over the existing use cases.
Business logic is not rewritten; the agent's tools call the same application layer.

### 7.1 Transport

- **Meta WhatsApp Cloud API (official).** Chosen over Twilio (adds margin) and
  unofficial libraries (violate ToS, ban risk, no reliable proactive messaging).
  Requires a verified WhatsApp Business Account, a phone number, and Meta review;
  this is an operational dependency to start early, like Resend / Google OAuth were
  in V1.
- Port `MessagingChannel` (send text, send template, fetch media); infra
  `WhatsAppCloudChannel`.

### 7.2 Inbound flow

```
User on WhatsApp
  → POST /api/v1/webhooks/whatsapp  (verify X-Hub-Signature-256 HMAC with app secret)
  → resolve ChannelIdentity (number → Lifedeck user); unlinked → pairing prompt
  → check entitlement (whatsappAssistant) + UsageMeter (credits)
  → enqueue via QStash (so the webhook returns fast, within Meta's timeout)
  → AgentRunner:
       text  → straight to the model
       audio → Transcriber (Gemini) → text
       image → VisionReader (Gemini) → description / extraction
  → tools: task/list/event CRUD, "minha agenda essa semana", "horários livres",
           plus general tools (weather, web knowledge)
  → reply via WhatsAppCloudChannel; debit credits on the UsageEvent ledger
```

- The webhook responds immediately and defers work to a queued job, because Meta
  retries on slow responses and the agent loop can take seconds.
- Conversation state: short-term context in Redis (`ConversationStore`), with a
  rolling summary so context stays bounded and cheap (caching-friendly).

### 7.3 The agent and its tools

- Built on the Vercel AI SDK (already in the stack from Phase 6.5), provider
  resolved the same way as today: `GEMINI_API_KEY` direct, else the AI Gateway,
  else an offline stub. Default model Gemini 2.5 Flash; complex or explicitly
  requested work routes to Gemini 3.1 Pro for entitled (Premium) users, debited at
  the higher credit weight.
- Tools are thin adapters over existing use cases, provided by the composition
  root. A tool call validates input, calls the use case **as the linked user**
  (same authorization the REST API enforces), and returns a compact result.
  Examples: `createTask`, `completeTask`, `getDailyBoard`, `createList`,
  `createEvent`, `findFreeSlots`, `getWeekAgenda`. General tools: `getWeather`
  (a `WeatherProvider` port), and model-native general knowledge.
- `AgentRunner` is a port; `AiSdkAgentRunner` the adapter. The tool registry is
  wired in the container, so the agent inherits every authorization and validation
  rule the rest of the app already has.

### 7.4 Identity linking

A WhatsApp number must be bound to an account before the agent acts as that user.
Pairing: the app shows a one-time code (or a `wa.me` deep link with a token); the
user sends it from their WhatsApp; the webhook verifies it and writes a
`ChannelIdentity` with `verifiedAt`. Until linked, the bot only explains how to
link. This prevents anyone from impersonating a user by messaging the bot.

### 7.5 Outbound and proactive alerts

- Replies inside the 24-hour service window are free on Meta's side and sent as
  normal messages.
- Proactive alerts (calendar reminders fired by the scheduler outside the window)
  are sent as **pre-approved template messages** (utility category), the only kind
  Meta allows outside the window. These carry a small per-message cost (see
  economics). Users opt in to WhatsApp alerts per reminder channel.

### 7.6 Multimodal

- Audio: download the media by id from Meta (authenticated), transcribe with
  Gemini (`Transcriber` port). Cheap (cents per minute).
- Image: Gemini vision (`VisionReader` port) for "what is this", receipt/agenda
  extraction, etc.
- Both count as 2 credits (Flash tier) per the metering table.

---

## 8. Plans, pricing, and quotas

Grounded in the unit-economics research (June 2026, ~R$5.5/USD). Key facts:
user-initiated WhatsApp conversations are free and unlimited on Meta since Nov
2024, so inbound assistant chat costs nothing; only proactive templates cost
(~R$0.04 each, Brazil utility). Gemini 2.5 Flash is ~R$0.03 per interaction;
Gemini 3.1 Pro ~R$0.18 (about 6x Flash, the only real cost driver). Payments route
by market: **Asaas in Brazil** (card 2.99% + R$0.49, Pix R$1.99 flat, plus native
boleto and NF-e) and **Stripe internationally** in USD (card ~2.9% + $0.30). The
fixed-fee component is why the Pro anchor is R$14.90, not R$9.90, and why annual
billing (which dilutes the fixed fee to ~1-3%) is pushed. On cards Asaas beats
Stripe at every ticket; on Pix the flat fee crosses over above ~R$167, so annual
tickets favor Asaas while low-ticket monthly favors a percentage gateway.

### Plans

Annual billing is two months free (pay 10, get 12), which also amortizes Stripe's
fixed fee across one charge instead of twelve. Pix is surfaced first in Brazil.

| Plan | Monthly | Annual | AI model | Headline capabilities |
| ---- | ------- | ------ | -------- | --------------------- |
| **Free** | R$0 | - | Flash, text only | All of V1, plus a WhatsApp taster (~15 credits/week). No calendar sync. |
| **Pro** | R$14.90 (~$4.99) | R$149 | Flash | Google Calendar sync, reminders, WhatsApp assistant (text + audio + image), generous capped quota. |
| **Premium** | R$29.90 (~$9.99) | R$299 | Flash + 3.1 Pro (credit-metered) | Everything in Pro, plus the stronger model for complex requests, higher quotas, and (later) Apple/cal.com, priority. |

### Quotas (illustrative; tuned during build)

Sized so a user at the ceiling still costs less than the post-Stripe net revenue
of the plan.

| Plan | 5-hour window | Weekly window | Pro-model access |
| ---- | ------------- | ------------- | ---------------- |
| Free | ~5 credits | ~15 credits | none |
| Pro | ~40 credits | ~200 credits | none |
| Premium | ~80 credits | ~500 credits | within the credit budget (6 credits each) |

At the Pro ceiling (~200 Flash credits/week) the variable cost is ~R$5-6; net of
Stripe on R$14.90 that leaves healthy margin, and the typical user (3-4
interactions/day) never approaches the cap. At the Premium ceiling the credit
budget caps Pro-model spend at ~R$12-15 variable, leaving ~45-55% margin worst
case.

### Margin sanity check (per active user, variable cost only)

| Profile | Monthly variable cost |
| ------- | --------------------- |
| Light (100 interactions, mostly text) | ~R$4 |
| Heavy Pro (capped, ~200/week Flash) | ~R$5-6 |
| Heavy Premium (capped, with 3.1 Pro) | ~R$12-15 |

The Free taster costs ~R$1-2 per active user and is the strongest conversion hook
into Pro.

---

## 9. Security, privacy, and compliance

- **WhatsApp webhook**: verify `X-Hub-Signature-256` (HMAC with the app secret) on
  every inbound request; reject unsigned. Verify the `hub.challenge` handshake on
  setup.
- **Identity binding**: the agent only acts after a verified `ChannelIdentity`.
  Every tool call goes through the same authorization the REST API enforces (the
  agent has no privileged path).
- **Prompt injection**: user message content is data, never instructions, with a
  fixed system prompt, continuing the Phase 6.5 safeguard. Tool outputs are
  likewise treated as untrusted by the model.
- **Token storage**: Google refresh tokens and any provider secrets are encrypted
  at rest (application-level encryption with a key from env), never logged, never
  returned by the API or the data export.
- **Stripe**: subscription state is driven only by signed webhooks; client
  redirects are not trusted. PCI scope stays with Stripe (Checkout + Portal, no
  card data touches Lifedeck).
- **LGPD**: WhatsApp number, message content, and AI usage are personal data.
  Extend the existing `exportUserData` (Phase 11) to include `ChannelIdentity`,
  `Subscription`, `UsageEvent`, calendar data, and the conversation summary; extend
  account deletion's cascade to all of it. Conversation history has a retention
  window and is redactable. Update `/terms` and `/privacy` (already localized
  en/pt/es) to cover WhatsApp, AI processing, calendar access, and payment.
- **Rate limiting**: the WhatsApp webhook and billing webhooks get their own
  Upstash limiters, alongside the existing API and auth limiters.
- **CSP / headers**: new external origins (Stripe, Meta media, Google APIs,
  QStash) are added narrowly to `connect-src`; the strict nonce CSP stays.

---

## 10. New environment variables

All optional-with-graceful-fallback where feasible, matching the V1 convention
(unset AI key falls back to the stub; unset Upstash no-ops the limiter).

```
# Billing - Asaas (Brazil)
ASAAS_API_KEY, ASAAS_WEBHOOK_TOKEN, ASAAS_ENV (sandbox|production)

# Billing - Stripe (international)
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_* (per plan/interval, USD)

# Scheduling
QSTASH_TOKEN, QSTASH_CURRENT_SIGNING_KEY, QSTASH_NEXT_SIGNING_KEY

# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID,
WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, WHATSAPP_VERIFY_TOKEN

# Google Calendar (extends existing Google OAuth)
GOOGLE_CALENDAR_SCOPES (or reuse GOOGLE_CLIENT_ID/SECRET with calendar scopes)

# Encryption + misc
DATA_ENCRYPTION_KEY (token-at-rest encryption)
WEATHER_API_KEY (weather tool)
GEMINI_PRO_MODEL_ID (default for the Premium tier; reuses GEMINI_API_KEY)
FEATURES_V2 / FEATURE_CALENDAR / FEATURE_WHATSAPP / FEATURE_BILLING
```

---

## 11. Implementation phases

Each phase is small, independently shippable, ends green (`pnpm check`, coverage
>= 95%), and lands behind a flag. Numbered V2-1 onward; they slot into
`DEVELOPMENT_PLAN.md` after the current work. Legend: **[ ]** todo.

### V2-1 - Entitlements and feature flags

- [x] `Plan` value object (`free`/`pro`/`premium`) + `Entitlement` value object,
      with the catalog (entitlements + 5h/weekly credit quota per plan) and pure
      functions `planGrants`/`entitlementsForPlan`/`quotaForPlan`. Domain, 100%
      covered. Prices/gateway refs deferred to V2-3 (kept out of the pure domain).
- [x] `EntitlementService` port (application) + `PlanEntitlementService`
      (infrastructure) with an injectable `resolvePlan` defaulting to the free plan
      until billing lands. 100% covered.
- [x] `FEATURE_*` env flags + SSR-safe resolver (`isFeatureEnabled`, master
      `FEATURES_V2` gates every pillar); `requireFeature` (404 when off) /
      `requireEntitlement` (403) guards next to `requireScope`. 100% covered.
- [x] `UserView` gains optional `plan` + `entitlements`; `GET /api/v1/sessions/me`
      populates them via the entitlement service (flows to the client through
      `useSession`). No user-visible change (all V2 flags off).
- [ ] Nav becomes a filtered list + "Em breve" badge. Deferred to V2-5, where the
      first gated item (calendar) actually exists - the entitlement data is already
      on the client, so this is a small additive change then, not dead UI now.

### V2-2 - Scheduling infrastructure

- [x] `ScheduledJob` domain entity + Prisma model + migration `10_scheduled_jobs`
      (next free number; `9_` was stale). Ports `JobQueue` + `ScheduledJobRepository`;
      `OutboxJobQueue` adapter (the DB outbox is the source of truth; QStash or Vercel
      Cron drive the drain endpoint on a cadence). Domain/app/queue 100% covered;
      Prisma repo coverage-excluded like the others.
- [x] `dispatchDueJobs` use case with retry + exponential backoff (reschedules a
      recoverable failure, fails permanently past `maxAttempts`, fails an unknown job
      type). No intermediate `processing` state - a crash mid-handler re-runs next
      tick rather than leaving a stuck job, so handlers must be idempotent. Endpoint
      `POST /api/v1/internal/dispatch-jobs` guarded by `isAuthorizedCron`
      (`Authorization: Bearer $CRON_SECRET`; works for both Vercel Cron and a QStash
      schedule). Not registered in OpenAPI (internal).
- [x] Daily-digest handler wired (`daily-digest` job type → `sendDailyDigest`),
      proving the engine end-to-end. [ ] The per-user daily fan-out enqueuer (enqueue
      a digest job per eligible user at their local morning) lands in V2-6 alongside
      reminders, which share the same scheduler. Operational: set `CRON_SECRET` and
      point a QStash schedule (or Vercel Cron) at the endpoint - left to deploy setup,
      like the V1 digest trigger.

### V2-3 - Billing and plans (Asaas BR + Stripe international) - DONE

- [x] `Subscription` entity + VOs (`subscription-status`, `payment-provider`) +
      migration `11_subscriptions`; `SubscriptionRepository` (+ Prisma + in-memory);
      `PaymentGateway` port (single abstraction over both gateways) with a
      normalized `SubscriptionEvent`. Use cases: `startCheckout` (market routing),
      `handleSubscriptionWebhook` (idempotent create/update), `resolvePlanFromSubscription`.
- [x] `AsaasPaymentGateway` (BR): hosted recurrent payment link (`/v3/paymentLinks`,
      `billingType: UNDEFINED` so the customer picks Pix/card/boleto), `externalReference`
      carries `userId|plan|interval`; webhook authenticated by `asaas-access-token`
      token, maps `PAYMENT_*`/`SUBSCRIPTION_DELETED` events to the normalized shape.
      Adapted from Obra Nova's verified Asaas client patterns.
- [x] `StripePaymentGateway` (international USD): Checkout Session (`mode=subscription`),
      `subscription_data.metadata` carries userId/plan; webhook verified with
      HMAC-SHA256 over `t.rawBody` (`timingSafeEqual`). Both webhooks idempotent.
- [x] Market-based gateway routing at checkout (`POST /api/v1/billing/checkout`).
- [x] Real entitlements wired from the active subscription
      (`resolvePlanFromSubscription` -> `PlanEntitlementService`). All flag-gated
      (`requireFeature('billing')`). Gateway adapters lazy-read env, coverage-excluded.
- [ ] Billing settings screen (UI) - deferred to V2-9 launch polish alongside the
      plan picker; the checkout + webhook backend is complete and flag-gated.

### V2-4 - AI metering (credits) - DONE

- [x] `UsageMeter` port + `RedisUsageMeter` (Upstash REST sorted-set rolling
      windows, credit-weighted members, no-op when Upstash unset) + `UsageEvent`
      ledger entity/port/Prisma repo + migration `12_usage_events`; credit-cost
      weighting in domain (`value-objects/ai-operation.ts`: listGeneration/
      assistantText 1, assistantPro 6, audio/vision 2).
- [x] Rolling 5-hour and weekly windows enforced against `quotaForPlan`;
      `consumeCredits` (checks both windows, debits, records ledger, throws
      `QuotaExceededError`) and `getUsage` use cases. `QuotaExceededError` -> HTTP 429.
- [x] Enforced on `/lists/generate` (gated by `isFeatureEnabled('v2')` so V1 is
      untouched until launch); `GET /api/v1/usage` view. Container wires meter +
      ledger + both use cases, reusing the subscription-backed `resolvePlan`.

### V2-5 - Calendar core and Google sync (backend core DONE)

- [x] Domain: `CalendarEvent` (title/description/location/start/end/allDay,
      reminder offsets, reuses `RecurrenceRule`, `isOwnedBy`, window invariant).
      Repository port + in-memory + Prisma + migration `13_calendar_events`
      (reminders `Int[]`, recurrence `JSONB`). Reminder offsets live on the event;
      `Reminder` dispatch entity belongs to V2-6.
- [x] Event CRUD + range-list/get use cases + REST (`/api/v1/calendar/events`
      [+ `/{id}`], feature-gated `calendar` + new `calendar:read`/`calendar:write`
      scopes) + OpenAPI (`CalendarEventView` + 5 paths).
- [x] **Google sync core (DONE):** sync columns (source/externalId/etag/syncedAt)
      on `calendar_events` + `CalendarConnection` model, both via additive migration
      `14_calendar_sync`. `CalendarProvider` port (exchangeCode/refresh/listChanges/
      pushEvent/deleteEvent/watch) + `CalendarConnectionRepository`. Use cases
      `pullCalendarChanges` (incremental: refresh-token-if-needed, last-writer-wins
      by `updatedAt`, create/update/delete reconcile, advances syncToken),
      `pushCalendarEvent` (outbound, links external id/etag), `connectGoogleCalendar`
      (token exchange + upsert connection). Fully unit-tested with a fake provider.
- [x] **Google live wiring (DONE):** `GoogleCalendarProvider` HTTP adapter
      (OAuth consent `authUrl`, token exchange/refresh, Calendar REST v3 list/
      push/delete, incremental `syncToken` with 410->full-resync, watch channel);
      OAuth connect (`/api/v1/calendar/google/connect`) + callback routes (state
      cookie, then best-effort watch + initial pull); watch webhook
      `/api/v1/webhooks/google` -> `handleCalendarNotification` enqueues a
      `calendar-pull` job; `calendar-pull` handler on the V2-2 dispatcher runs
      `pullCalendarChanges`; container fully wired. All flag-gated (`calendar`).
- [x] **Outbound push + token security (DONE):** local create/update enqueue a
      `calendar-push` job (-> `pushCalendarEvent`, no-op without a connection);
      delete enqueues `calendar-delete` (-> `deleteRemoteCalendarEvent`) when the
      event was synced. Pull writes via the repo directly, so inbound changes never
      echo back out. Google tokens are encrypted at rest (AES-256-GCM,
      `CALENDAR_TOKEN_KEY`; plaintext passthrough in dev).
- [x] **Calendar UI (DONE):** `/calendar` page with month grid + week/day agenda
      views, prev/today/next navigation, an event editor sheet (create/edit/delete,
      Google-sourced events are read-only-delete-guarded), and a Google connect
      button. Hooks (`use-calendar-events`) + view math (`lib/calendar/calendar-view`)
      are unit-tested; i18n added across en/pt/es. Nav entry is gated on the
      `calendarSync` entitlement (hidden until granted = true dark-launch).
      **Remaining follow-ups:** periodic channel-renew + full reconcile jobs (pair
      with V2-6 scheduling fan-out), RRULE<->RecurrenceRule mapping, mobile tab-bar/
      profile-sheet calendar entry, hour-grid (time-axis) week/day views.

### V2-6 - Reminders and proactive delivery - DONE

- [x] Creating an event enqueues an `event-reminder` job per future offset
      (runAt = startsAt - minutes). The `event-reminder` handler delivers an
      in-app `Notification`, self-rescheduling if the event moved later and
      skipping if it already started (so deleted events / removed offsets drop
      cleanly). In-app is the V2-6 channel; email/WhatsApp routing lands in V2-8.
- [x] Reminder config on the event editor (toggle chips: at start / 10m / 30m /
      1h / 1d).
- [x] **Fan-out enqueuers (DONE):** `enqueueDailyDigests` (per-user digest at
      their local morning hour, via `civilHour` + `users.listForDailyDigest`),
      `reconcileCalendars` (a `calendar-pull` per connection), and
      `renewCalendarChannels` (a `calendar-watch` per channel within 24h of
      expiry). A new `calendar-watch` job type drives `watchGoogleCalendar` on the
      dispatcher. All three run from `runScheduledFanOut`, exposed at the cron
      endpoint `POST /api/v1/internal/fan-out-jobs` (guarded by `isAuthorizedCron`).
      Repos gained `listForDailyDigest` / `listAll`. Operational: point a QStash
      schedule (or Vercel Cron) at the endpoint, like the dispatch endpoint.

### V2-7 - WhatsApp transport and identity - DONE

- [x] `MessagingChannel` port (`sendText`) + `WhatsAppCloudChannel` (Meta Graph
      v21 send; no-op when creds unset) + `createMessagingChannel` factory.
      Verified webhook `/api/v1/webhooks/whatsapp`: GET `hub.challenge` handshake
      (verify-token match), POST verifies `X-Hub-Signature-256` HMAC against
      `WHATSAPP_APP_SECRET` (fails closed when the secret is unset). Pure
      `verifyWhatsAppSignature` + `parseInboundMessages` helpers, tested.
- [x] `ChannelIdentity` entity (channel/address-E.164/pairingCode + 10-min
      expiry/verifiedAt) + `message-channel` + `phone-number` VOs + migration
      `15_channel_identities`. Pairing: `startWhatsappPairing` issues a
      time-boxed code (POST `/api/v1/messaging/whatsapp/pairing`, session-auth);
      `handleInboundWhatsApp` resolves the sender, links on a valid unexpired
      code (bound to the inbound address), and otherwise replies with
      until-linked guidance. A verified number gets an echo (V2-8 swaps in the
      AI assistant). All flag-gated (`whatsapp`).
- [ ] **Deferred to V2-9 security pass:** dedicated Upstash rate limiter on the
      WhatsApp webhook + `messageId` idempotency/replay store (the 10-min code
      expiry already bounds brute-force; both are listed in the security section).

### V2-8 - WhatsApp AI assistant (text path DONE)

- [x] **Agent text path (DONE):** `AgentRunner` port + `AiSdkAgentRunner`
      (Vercel AI SDK `generateText`, Gemini Flash by default, same provider
      resolution as list generation: `GEMINI_API_KEY` direct, else `AI_MODEL`
      gateway, else a stub) + `ConversationStore` port + `RedisConversationStore`
      (Upstash, 20-turn rolling window, 24h TTL; in-memory fallback). The
      verified-number branch of `handleInboundWhatsApp` now orchestrates:
      identity → entitlement (`whatsappAssistant`, else upsell) → meter
      (`consumeCredits` 1 credit before the model call, quota reply on
      `QuotaExceededError`) → agent → reply + persist the turn. Flag-gated.
- [ ] **Tool registry (next slice):** thin tools over existing use cases
      (createTask/getDailyBoard/createEvent/getWeekAgenda...) acting as the
      linked user, plus `WeatherProvider`. Needs default-list/confirmation UX.
- [ ] `Transcriber` (audio) and `VisionReader` (image) ports + Gemini adapters;
      webhook handles audio/image message types (fetch media from Meta).
- [ ] Premium routes complex requests to Gemini 3.1 Pro (debit `assistantPro` =
      6 credits instead of the flat `assistantText`).
- [ ] Proactive WhatsApp alerts (utility templates) as a reminder channel
      (extend `MessagingChannel` with `sendTemplate`; route from `deliverReminder`).

### V2-9 - Launch polish

- [ ] Extend `exportUserData` + deletion cascade to all new data; update
      `/terms` and `/privacy` (en/pt/es).
- [ ] E2E happy paths (calendar create + reminder; WhatsApp link + a tool call
      against a stubbed channel); docs (`docs/calendar.md`, `docs/whatsapp.md`,
      `docs/billing.md`); OpenAPI complete.
- [ ] Full code review (parallel reviewers per layer, as in Phase 12.6); flip
      `FEATURES_V2` on in production.

---

## 12. Risks and open questions

- **Meta approval and template policy.** WhatsApp Business verification and
  utility-template approval take time and can be rejected. Start the Meta setup
  early (operational, like the V1 Resend/Google steps). Risk: proactive alerts
  blocked or re-categorized as marketing (more expensive).
- **Google sync correctness.** Two-way sync is the hardest engineering surface
  (echo loops, channel expiry, missed notifications, timezone/all-day edge cases).
  Mitigation: dedupe by `externalId` + `externalEtag`, a periodic full reconcile,
  and integration tests against a recorded Google fixture.
- **Gateway fees and dual-gateway ops.** Fee figures are approximate and the
  provider tables change; confirm current Asaas (card, Pix, boleto, NF-e) and Stripe
  (USD card) rates before locking prices and quotas. Running two gateways doubles the
  operational surface (two dashboards, two webhooks, two reconciliations); the
  `PaymentGateway` port keeps the code cost low, but the ops cost is real. Mitigation:
  the Asaas integration already exists in Obra Nova (`/home/gabriel/work/obranova`),
  so the BR side is a known quantity, not greenfield.
- **Audio cost uncertainty.** Gemini audio tokenization rate needs a real
  measurement; the credit weight for audio is a conservative estimate.
- **Abuse and cost runaway.** A compromised or abusive linked number could burn
  credits. The meter caps spend per user; add anomaly alerts on the ledger.
- **Quota tuning.** The illustrative credit limits must be validated against real
  usage once the agent is live; they are configured on the `Plan` object precisely
  so tuning is a config change, not a code change.

---

## 13. Out of scope

- Business / team plans and the Family/Couple shared plan.
- The Expo mobile app (still `DEVELOPMENT_PLAN.md` Phase 13). The V2 REST surface
  is designed to be consumed by it later unchanged.
- Live websocket push (V2 uses WhatsApp + email for proactive delivery).
- Apple (CalDAV) and cal.com providers ship after Google, behind the same
  `CalendarProvider` port.
- Frontier models (e.g. Opus) in consumer tiers. Deliberately dropped: Gemini
  Flash and 3.1 Pro cover the use case at a fraction of the cost.
```
