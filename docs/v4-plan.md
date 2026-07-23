# Lifedeck V4 plan

V3 turned Lifedeck into a proactive personal assistant over WhatsApp and the web.
V4 has two goals, and only two:

1. **Ship a React Native app** that mirrors the web app as closely as possible.
   The app is a thin client over the same versioned HTTP API (`/api/v1`). We
   reuse every pure package (`domain`, `application`, `i18n`) and rebuild only the
   presentation layer natively.
2. **Turn `generate` into a WhatsApp-style chat** on both web and app, so the two
   platforms stay identical. The one-shot brief form becomes a multi-turn
   conversation that proposes a plan you can save.

**Principle: change little in the system.** The backend stays as-is except for two
small, additive changes (a header-based session token for mobile, and a
conversational generate endpoint). No breaking changes, no schema migrations for
the app itself.

## Contents

1. What we reuse vs rebuild
2. V4-0 — Foundation (`apps/mobile` scaffold)
3. V4-1 — Auth for mobile (Bearer session token)
4. V4-2 — Shared client layer (`packages/client`)
5. V4-3 — Design system in React Native (NativeWind)
6. V4-4 — Screen parity (port every route)
7. V4-5 — Generate → chat (web + app)
8. Billing on mobile (Apple/Google IAP)
9. Delivery order
10. Risks and open questions

---

## 1. What we reuse vs rebuild

The monorepo already separates pure logic from presentation. That pays off here.

**Reuse as-is (pure TS, zero DOM):**

- `@lifedeck/domain` — entities/value-objects, no runtime deps.
- `@lifedeck/application` — use-cases, ports, DTOs (Zod). All `*View`/`*Input`
  types the app needs (`ListView`, `TaskView`, `HabitView`, `GenerationBrief`,
  `GeneratedListView`, `UserView`) live here.
- `@lifedeck/i18n` — `en`/`pt`/`es` messages + locale helpers. Plain objects, no
  React. We reimplement only the thin React context provider in RN.

**Consume over HTTP:** the whole `/api/v1` surface. The app talks to the same
endpoints the web does; the envelope (`{ data }` / `{ error: { code, message } }`)
is unchanged.

**Rebuild for RN:**

- `@lifedeck/ui` — React-DOM + Tailwind `className` + `framer-motion`. Not
  portable. We rebuild the primitives (`Button`, `TextField`, `Skeleton`,
  `Dialog`, etc.) as RN components with the same prop API.
- The client fetch wrapper — the web uses `credentials: 'include'` (cookie), which
  RN does not persist. See V4-1.

**Server-only, never in the app:** `@lifedeck/infrastructure` (Prisma/Neon,
argon2, Resend, Blob, AI SDK). The app never imports it.

---

## 2. V4-0 — Foundation (`apps/mobile` scaffold)

A new workspace package `apps/mobile`, Expo + Expo Router, integrated into the
existing pnpm + Turborepo setup.

- **Expo Router** — file-based routing that maps to the web's App Router almost
  1:1. Each web route becomes a screen of the same name.
- **NativeWind** — Tailwind for RN. Lets us port `className` markup and, crucially,
  reuse the design tokens (see V4-3) so the visual language transfers directly.
- **Metro** configured for the monorepo (watch workspace root, resolve
  `@lifedeck/*` from `packages/*`).
- Turborepo tasks (`lint`, `typecheck`, `test`) wired so `pnpm check` covers the
  app too. Native builds run through **EAS Build/Submit**, not Turbo.

Tab bar mirrors the web `mobile-tab-bar`: **Today (`/`)**, **Lists (`/lists`)**,
**Generate (`/generate`, center action)**, **Profile (`/settings`)**. Secondary
routes (habits, recurring, calendar, analytics, developers) hang off the Profile
hub and deep links, same as the web mobile layout.

---

## 3. V4-1 — Auth for mobile (Bearer session token)

**The only structural backend change.** Today a session is an HS256 JWT
(`AUTH_SECRET`, 7-day TTL) stored in an httpOnly cookie `lifedeck_session`. RN
`fetch` does not persist cookies.

Minimal, additive change (no new auth scheme, same JWT):

- Session-issuing endpoints (`sessions/guest`, `auth/sign-in`, register/verify,
  google callback) **also return the token in the body** (`{ data: { token, user } }`)
  in addition to setting the cookie. The web keeps using the cookie and ignores
  the field.
- `getUserIdFromRequest` **also accepts `Authorization: Bearer <sessionJWT>`**, not
  only the cookie. Same verification path.
- The app stores the token in **Expo SecureStore** and sends it on every request.

This reuses the existing JWT end to end. No table, no migration, no change to how
sessions are verified — only a second transport. The API-key Bearer path
(`tk_live_...`) stays reserved for `/developers`.

---

## 4. V4-2 — Shared client layer (`packages/client`)

The web's React Query hooks (`use-habits`, `use-lists`, `use-ai`, `use-session`,
…) depend only on a fetch wrapper + `@lifedeck/application` types — they are
portable. We extract them into a new pure package `packages/client`:

- `createApiClient({ baseUrl, getToken, getLocale })` — factory returning the
  `apiRequest` / `apiRequestPage` used by the hooks. Web injects a
  cookie-based client (`credentials: 'include'`); mobile injects a Bearer client
  reading SecureStore. Same hooks, different transport.
- All `useQuery`/`useMutation` hooks and cache-invalidation logic move here and are
  shared. This keeps web and app behavior identical by construction.

The web migrates to consume `packages/client` (mechanical refactor, no behavior
change). If extraction proves noisy, the fallback is thin duplicated hooks in the
app — but shared is the target.

---

## 5. V4-3 — Design system in React Native (NativeWind)

- A `tailwind.config` in the app mirrors the `@theme` tokens from
  `packages/ui/src/styles.css`: brand (hue 280, 50–900), ink (hue 265, 200–900),
  `line`/`surface`/`bg`, semantic `success`/`danger`/`warning`, `violet-500`,
  deck tints, radii (`lg` 8 / `xl` 12 / `2xl` 16 / `card` 12), soft shadows. The
  tokens are the single source of truth; NativeWind accepts oklch and arbitrary
  values.
- Rebuild `@lifedeck/ui` primitives as RN components with matching prop APIs:
  `Button`, `TextField`, `Skeleton`, `Dialog` (→ Modal / bottom sheet), badges,
  cards. Screen components (habits, recurring, lists) are rewritten in RN
  following the already-shipped redesign as the visual reference.
- Animations that were `framer-motion` become `react-native-reanimated`
  (streak celebrate, shimmer, glow).

---

## 6. V4-4 — Screen parity (port every route)

One RN screen per web route, same data, same states (loading skeleton / error /
empty / content):

| Web route | Mobile screen | Notes |
|-----------|---------------|-------|
| `/` | Today / daily board | Home tab |
| `/lists`, `/lists/[id]` | Lists + list detail | tasks/subtasks |
| `/habits` | Habits | streak week bar, check-in |
| `/recurring` | Recurring | rule editor |
| `/calendar` | Calendar | events + connections |
| `/analytics` | Analytics | |
| `/settings` (+ `/billing`) | Profile hub + plans | see IAP note |
| `/developers` | API keys | |
| `/generate` | Chat | V4-5 |
| `/share/[token]` | Public shared board | deep link, no shell |

Read-heavy screens (Today, Lists, Habits, Recurring, Calendar, Analytics) ship
first; they only need the client layer + primitives.

---

## 7. V4-5 — Generate → chat (web + app)

Replace the one-shot brief form (`ai-generator.tsx`) with a WhatsApp-style
conversation on both platforms.

**Backend — new endpoint `POST /api/v1/lists/generate/chat` (streaming):**

- AI SDK `streamText` with **tool calling**. A tool `proposeList({ title, tasks })`
  reuses the existing `generatedPlanSchema`. The assistant chats (asks scoping
  questions, like a real WhatsApp thread) and, once it has enough context, calls
  the tool to emit a **plan card** the user approves.
- **Stateless** — the message history is sent in the request body each turn; the
  server persists no conversation. This avoids new tables and, importantly,
  **avoids Neon compute cost** (consistent with our "assess DB cost before
  features" rule) — the chat never touches the database until the user saves.
- **Save** reuses `persistDraft` unchanged (`POST /lists` then `POST /tasks` per
  task), then navigates to `/lists/[id]`.
- **Credits / rate-limit** reuse `consumeCredits` + `checkGenerateRateLimit`, but
  metered when a plan is **proposed** (not per message) to bound token cost.

**Web:** `useChat` from `@ai-sdk/react`. **Mobile:** AI SDK supports RN via
`expo/fetch` streaming — same chat logic. The existing `messaging/whatsapp`
channel is unrelated; "WhatsApp" here is only the in-app UI metaphor.

---

## 8. Billing on mobile (Apple/Google IAP)

Stripe/Asaas web checkout works in a browser, but Apple and Google require **In-App
Purchase** for digital goods. To keep V4 scoped, the app **manages plans on the
web** (opens the billing page / shows current entitlements) and does not sell
in-app. Native IAP is a V4.1 decision. Entitlement reads (`sessions/me`,
`usage`) work as-is.

---

## 9. Delivery order

One PR-sized phase at a time:

1. **V4-0** — `apps/mobile` scaffold (Expo Router + NativeWind + Metro + Turbo).
2. **V4-1** — Bearer session token (backend additive) + SecureStore + guest/login
   flow in the app.
3. **V4-2** — `packages/client` extraction; web migrates onto it.
4. **V4-3** — RN design system (tokens + primitives).
5. **V4-4** — Screen parity, read-heavy screens first, then write flows.
6. **V4-5** — Generate chat: endpoint + web UI + app UI (the largest new piece).
7. Polish, deep links, EAS Build/Submit to stores.

---

## 10. Risks and open questions

- **Expo SDK / RN / React 19 alignment.** The web is on React 19; pin an Expo SDK
  that supports it. Verify at scaffold time.
- **`packages/client` extraction noise.** If the web hooks are more coupled to
  Next than expected, fall back to thin duplicated hooks in the app.
- **Streaming in RN.** Depends on `expo/fetch`; validate the chat stream on a
  device early.
- **IAP.** Deferred to V4.1; V4 sends billing to the web.
- **Push notifications** (Expo Notifications) — deferred to V4.1.
- **Offline.** V4 assumes an online thin client; React Query cache only. No
  offline-first sync.

---

## 11. Progress log

As of 2026-07-23 (branch `v4`), roughly 25% of the effort is done — the
foundation is in place; screen parity (V4-4) and the chat (V4-5) are the bulk of
what remains.

- **V4-0 — done.** `apps/mobile` on Expo SDK 57 (RN 0.86, React 19.2), Expo
  Router + NativeWind, Metro wired for the pnpm monorepo. Design tokens mirrored
  from `styles.css` to `src/theme/palette.json` (oklch converted to sRGB hex so
  RN can parse them). Tab shell (Today / Lists / Generate / Profile) with
  placeholder screens. Support fixes: pinned `typescript` in `@lifedeck/config`
  and an `@types/react` override to keep the workspace on one version.
- **V4-1 — done.** Backend is additive: `getUserIdFromRequest` also accepts the
  session JWT via `Authorization: Bearer`; `okSession` returns the token as a
  sibling of `data` from the guest and sign-in routes (web keeps using the
  cookie). App stores the token in SecureStore and boots a guest session through
  `SessionGate` (onboarding overlay). Covered by new session/respond tests.
- **V4-2 — done, scoped to the transport.** `packages/client` holds the shared
  `createApiClient` factory + `ApiError` (100%/95.8% covered). Web and mobile
  both consume it; the web's 21+ importers are unchanged. **Hook migration was
  deliberately deferred to V4-4** — auth hooks are platform-coupled (cookie vs
  token), so the data hooks move per screen as they are ported (the "extraction
  noise" fallback in section 10).
- **V4-3 — core primitives done.** Rebuilt in `apps/mobile/src/components/ui`:
  Button, Card, Badge, TextField, Skeleton, EmptyState, Avatar, ProgressBar
  (same prop APIs; web-only pseudo classes dropped, `Animated` used instead of
  reanimated for the skeleton pulse). Remaining `@lifedeck/ui` primitives
  (Dialog→Modal, Tabs, Toast, TaskCheckbox, PasswordField, Celebration, Logo)
  are built on demand during V4-4.
- **Not yet validated on a real device/emulator.** Everything passes
  typecheck/lint/tests/package builds; the first `expo start` against the
  deployed backend (Bearer reaching `/sessions/me`) is still ahead.

Next: **V4-4**, starting with the read-heavy screens (Today, Lists, Habits).
