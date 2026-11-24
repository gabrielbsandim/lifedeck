# Booking

A host publishes a page at `/b/<slug>` where clients pick a free time for one of
the host's services. Bookings land in the host's calendar (and Google, when
connected), clients get emails with an `.ics`, and the host manages everything
from the web, the phone or the assistant. No payment: charging clients is out of
scope.

## Domain (`packages/domain`)

- `BookingPage`: one per owner. `slug` (3 to 40 letters, digits or hyphens,
  reserved words refused), `displayName`, `headline`, `timezone`, `locale`,
  `cancelNoticeMin`, `active` (a paused page refuses new bookings).
- `BookingService`: name, `durationMin`, `slotStepMin`, buffers before and after,
  `minNoticeMin`, `maxHorizonDays`, `maxPerDay`, `location` (`online-meet`,
  `online-link`, `in-person`, `phone`), `priceLabel` (text only),
  `requiresApproval`, `active`, `position`.
- `WeeklyWindow` and `AvailabilityOverride`: minutes from midnight in the page
  zone. An override replaces the weekly hours of one civil date; no windows means
  closed all day.
- `BookingClient`: the host's client (third-party personal data). Needs an email
  or a phone; reused by phone or email on the next booking.
- `Booking`: `pending`, `confirmed`, `cancelled`, `declined`, `completed`,
  `no_show`. `holdsSlot` is true for pending and confirmed. `source` is `public`,
  `host` or `assistant`.
- `bookableSlots(...)`: the pure slot engine. Weekly hours and overrides in the
  page zone (DST safe), minus busy calendar events, other holding bookings and
  their buffers, inside notice and horizon, capped per day.

## Double booking

Two guards. In the app, every booking recomputes its slot from fresh data and
never trusts the browser. In Postgres, `bookings_no_overlap` is an exclusion
constraint (`btree_gist`) on `owner_id` and `tsrange(starts_at, ends_at)` for
holding statuses, so two clients racing for one slot get one booking and one
`409 SLOT_TAKEN`. Busy time in Google is read by a synchronous pull of the host's
calendars right before the booking is written; when the pull fails the booking
still goes through on local data and the failure is logged.

## Application

- Host: `getBookingSetup`, `upsertBookingPage`, `checkBookingSlug`, service CRUD
  and reorder, `setAvailability`, overrides, `listBookingClients`,
  `upsertBookingClientForHost`, `listBookings`, `confirm`, `decline`, `cancel`,
  `reschedule` (moves in place, same booking and link), `markBookingOutcome`,
  `createBookingForClient` (by client id; skips notice and horizon, may override
  the published hours, never an overlap), `listHostBookingSlots`.
- Public: `getPublicBookingPage`, `listBookableSlots` (31 days per call),
  `requestBooking`, `getManagedBooking`, `cancelBookingByToken`,
  `rescheduleBookingByToken`.
- `makeBookingLifecycle` owns the side effects of a state change: the calendar
  event (title `<service> with <client>`, created, moved or deleted with the
  booking), the client emails and the host notification, in one unit of work.

## Calendar and Google

The booking's `CalendarEvent` goes through the normal calendar use cases, so the
Google push and the host's reminders work unchanged. For `online-meet` services
the push asks Google for a Meet link (`conferenceData.createRequest`) and the
link is read back into the event; the confirmation email waits for it with one
synchronous push. Edits made in Google flow back on the next pull: deleting the
event cancels the booking (declines it when still pending), moving it
reschedules the booking, and both email the client. A move on top of another
booking is refused and logged as `booking_calendar_move_rejected`.

## Notifications

- Client: email with an `.ics` for each notice kind (`requested`, `confirmed`,
  `declined`, `cancelled`, `rescheduled`), plus a `reminder` 24 h before
  (`booking-reminder` job, dedup key per booking and offset; the handler re-reads
  the booking and skips it when it moved or ended). Each email carries the manage
  link `/b/manage/<token>`, an HMAC of the booking id that stops working once the
  booking ends. Clients can cancel up to `cancelNoticeMin` before the start.
- Host: in-app notification and push when the client books, cancels or moves
  (changes the host made themselves notify only the client).
- Client WhatsApp is V5.1: it needs an approved paid Meta template.

## Assistant

Booking tools, gated by the `booking` entitlement and switched off while
`FEATURE_BOOKING` is off: `findClient`, `addClient`, `listBookingSlots`,
`bookForClient`, `listMyBookings`, `cancelBooking`, `rescheduleBooking`,
`shareBookingLink`. The look-up-before-create rule is enforced in code, not only
in the prompt: `bookForClient` takes a client uuid, `addClient` refuses a name
that already matches a client until the host confirms a new person, and
`bookForClient` refuses a second booking of the same service for the same client
inside 7 days (a move the model mistook for a booking) unless the host asked for
an extra session.

## Surfaces

- Web, public: `/b/[slug]`, `/b/[slug]/[serviceId]`, `/b/manage/[token]`
  (`noindex`). The page data is cached and revalidated on edit; slots load from
  the API.
- Web, host: `/booking` with the setup wizard, then Bookings, Services, Hours,
  Clients and Page tabs. Bookings also show in `/calendar` with a badge.
- Mobile: `/booking` lists bookings (approve, decline, cancel, outcome), shares
  the link and shows services and hours read only; editing stays on the web.

## REST

Host routes live under `/api/v1/booking/*` with scopes `booking:read` and
`booking:write` (a session has both); public routes under
`/api/v1/public/booking/*` take no credentials. Every route is in the OpenAPI
document. Public limits: slot lookups 60 per minute per IP; booking requests 5
per 10 minutes per IP and per client email; a honeypot field and Vercel BotID on
the booking POST.

## Plans and data

Booking needs the `booking` entitlement (Pro and Premium). A user on a plan
without it can start one free 14-day trial (`POST /booking/trial`, no gateway):
a `feature_trials` row, unique per user and entitlement and kept after it ends,
that `PlanEntitlementService` adds to the plan's entitlements while `endsAt` is
in the future. When it ends the screens fall back to the upsell; the page, its
clients and bookings stay, and the public side answers 404 (the loader checks
the owner's entitlement; the cached page view lives up to 5 minutes, but slots
and requests are never cached) until the host subscribes. The account data
export includes the page, services, hours, clients and every booking. Deleting
the account cascades to all of them. For client data the host is the controller
and Lifedeck the operator under the LGPD; the privacy policy says so.

## Configuration

| Variable | Purpose |
| --- | --- |
| `FEATURE_BOOKING` | Turns the feature on (with `FEATURES_V2`). |
| `BOOKING_LINK_SECRET` | Signs manage links. Falls back to a key derived from `AUTH_SECRET`. |
| `NEXT_PUBLIC_BOTID_ENABLED` | Enables Vercel BotID on the booking POST. |
