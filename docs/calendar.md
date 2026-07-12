# Calendar and Google sync

Status: implemented (V2-5 and V2-6). Lifedeck is the source of record; Google is a
synced mirror. The feature is flag-gated behind `FEATURE_CALENDAR` (and the master
`FEATURES_V2`), and only surfaces per user when the `calendarSync` entitlement is
granted. This page records the model, the two-way sync, reminders, and the cron
jobs that keep it all moving.

## Domain

- `CalendarEvent` (`packages/domain/src/entities/calendar-event.ts`): `ownerId`,
  `title`, `description`, `location`, `startsAt`, `endsAt`, `allDay`, `reminders`
  (an array of offset minutes), an optional `recurrence` (reuses the V1
  `RecurrenceRule`, synced both directions), plus the sync columns `source`
  (`local` | `google`), `connectionId` (which calendar it belongs to),
  `externalId`, `etag`, `syncedAt`. Invariant: `endsAt >= startsAt`.
- `CalendarConnection` (`packages/domain/src/entities/calendar-connection.ts`):
  `ownerId`, `provider`, `accountEmail`, `isDefault`, `accessToken`, `refreshToken`,
  `tokenExpiresAt`, `calendarId`, `syncToken`, `channelId`, `resourceId`,
  `channelExpiresAt`. A user may hold several (unique per `ownerId + provider +
  accountEmail`). Tokens are encrypted at rest in infrastructure, never in the
  domain object.

Reminders are not a separate entity; the offsets live on the event and are
materialized as scheduled jobs (see below).

## Application

Event CRUD and listing: `makeCreateCalendarEvent`, `makeUpdateCalendarEvent`,
`makeDeleteCalendarEvent`, `makeGetCalendarEvent`, `makeListCalendarEvents` (range
query). Google sync: `makeConnectGoogleCalendar` (token exchange plus connection
upsert), `makePullCalendarChanges` (incremental, last-writer-wins by `updatedAt`),
`makePushCalendarEvent`, `makeDeleteRemoteCalendarEvent`, `makeWatchGoogleCalendar`,
`makeHandleCalendarNotification`. All under
`packages/application/src/use-cases/`.

Ports (`packages/application/src/ports/`): `CalendarProvider` (the sync
abstraction: `exchangeCode`, `refreshAccessToken`, `listChanges`, `pushEvent`,
`deleteEvent`, `watch`), `CalendarEventRepository`, and
`CalendarConnectionRepository`.

## Google two-way sync

`GoogleCalendarProvider`
(`packages/infrastructure/src/calendar/google-calendar-provider.ts`) implements
`CalendarProvider` over the Calendar REST v3 API.

- **Connect (OAuth):** a separate consent step from sign-in. `authUrl(state)` starts
  consent (offline access plus `openid email` so we can label the account, with
  `prompt=consent select_account` so a second account is picked deliberately); the
  callback runs `connectGoogleCalendar`, then best-effort `watchGoogleCalendar` and
  an initial `pullCalendarChanges`.
- **Multiple calendars:** a user can connect more than one Google account (for
  example personal and work). Each account is one `CalendarConnection`, keyed by
  `accountEmail`, with its own token, `syncToken`, and watch channel. One connection
  is the **default** (`isDefault`), which is where events created in Lifedeck sync;
  events pulled from Google carry the `connectionId` they came from, so edits and
  deletes push back to the right calendar. Managed via `listCalendarConnections`,
  `disconnectCalendar` (removes the connection and its events, promoting a new
  default if needed), and `setDefaultCalendar`. Per-owner use cases
  (`pullCalendarChanges`, `watchGoogleCalendar`) fan out over all of the owner's
  connections.
- **Inbound:** Google push notifications hit the watch webhook, which enqueues a
  `calendar-pull` job. The job pulls changes per connection via the stored
  `syncToken`; any failure with a stored token (a `410`, or a `400` after the
  query parameters changed) triggers one clean full resync. Create/update/delete
  reconcile deduped by `externalId`, adopting untagged legacy events into the
  connection that pulls them.
- **Outbound:** a local create or update enqueues a `calendar-push` job (targeting
  the event's connection, or the default for new events); a delete on a synced event
  enqueues a `calendar-delete` job carrying the connection id. Conflict resolution is
  last-writer-wins by `updatedAt`, deduped by `externalId` plus `etag` to avoid echo
  loops.
- **Recurrence:** recurring events sync both directions. The provider requests
  non-expanded events (`singleEvents=false`) so a series master carries its
  `RRULE`, and `packages/infrastructure/src/calendar/rrule.ts` maps between the
  local `RecurrenceRule` and Google's `recurrence` array. Modified/cancelled single
  instances (which carry a `recurringEventId`) are skipped; the series master is the
  source of truth. Rules Google expresses that the local shape cannot model
  (`FREQ=YEARLY`, ordinal `BYDAY`, `COUNT`, `RDATE`) degrade to a plain,
  non-recurring event rather than failing the sync.
- **Token security:** Google tokens are encrypted at rest with AES-256-GCM
  (`packages/infrastructure/src/crypto/token-cipher.ts`, key from
  `CALENDAR_TOKEN_KEY`). The cipher fails closed in production: with `NODE_ENV`
  set to `production` and no key, encryption throws rather than store plaintext.
  Plaintext passthrough happens only outside production, for local dev.

## Reminders

Creating an event enqueues one `event-reminder` job per future offset, at
`startsAt - minutes`. The `deliverReminder` handler
(`packages/application/src/use-cases/deliver-reminder.ts`) delivers an in-app
`Notification`, self-rescheduling if the event moved later and skipping if it
already started (so deleted events and removed offsets drop cleanly). When the user
has a verified WhatsApp number and `WHATSAPP_REMINDER_TEMPLATE` is set, it also
sends a best-effort WhatsApp utility template (event title plus start time),
alongside the in-app notification.

## Cron jobs

The scheduler is a DB outbox (`ScheduledJob`) drained on a cadence. Two protected
cron endpoints, both guarded by `isAuthorizedCron`
(`apps/web/src/server/api/cron-guard.ts`, `Authorization: Bearer $CRON_SECRET`):

- `POST /api/v1/internal/dispatch-jobs` drains due jobs, dispatching each by type
  (`calendar-pull`, `calendar-push`, `calendar-delete`, `calendar-watch`,
  `event-reminder`, `daily-digest`) with retry and backoff. Claiming a batch leases
  the jobs (their run time is pushed forward), so two overlapping runs never process
  the same job twice.
- `POST /api/v1/internal/fan-out-jobs` runs `runScheduledFanOut`, which fans out
  three enqueuers: `enqueueDailyDigests` (a digest per user at their local morning),
  `reconcileCalendars` (a `calendar-pull` per connection, catching missed
  notifications), and `renewCalendarChannels` (a `calendar-watch` per channel within
  24h of expiry).

Both endpoints also accept `GET` so Vercel Cron (which issues GET) can drive them.
`apps/web/vercel.json` declares the schedules: `dispatch-jobs` every minute and
`fan-out-jobs` every 15 minutes. Vercel attaches `Authorization: Bearer $CRON_SECRET`
automatically when `CRON_SECRET` is set. A QStash schedule pointed at either endpoint
works the same way.

## REST and scopes

Under `apps/web/src/app/api/v1/`, all `calendar`-flag gated:

- `calendar/events` (GET list by range, POST create) and `calendar/events/[id]`
  (GET, PATCH, DELETE). Scopes: `calendar:read`, `calendar:write`. Every calendar
  endpoint, plus the OAuth connect/callback, also enforces the `calendarSync`
  per-user entitlement (`requireEntitlement`), so flipping the feature flag does not
  by itself open calendar to non-entitled users.
- `calendar/connections` (GET list), `calendar/connections/[id]` (DELETE
  disconnect), `calendar/connections/[id]/default` (POST set default). Scopes:
  `calendar:read` / `calendar:write`. Documented in the public OpenAPI.
- `calendar/google/connect` (start OAuth) and `calendar/google/callback`.
- `webhooks/google` (watch notifications, keyed by the `X-Goog-Channel-ID` header).
  When `GOOGLE_CALENDAR_WEBHOOK_TOKEN` is set, the route verifies the
  `X-Goog-Channel-Token` header against it and returns `401` on mismatch; the watch
  channel is opened with the same token.

Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`GOOGLE_CALENDAR_REDIRECT_URI`, `CALENDAR_TOKEN_KEY`,
`GOOGLE_CALENDAR_WEBHOOK_TOKEN` (optional), `CRON_SECRET`,
`WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_TEMPLATE_LANGUAGE`.
