# Lifedeck V4 plan

> **Status: shipped.** Every phase below is done — see the progress log in
> section 11 for what landed, where the implementation diverged from this plan,
> and the follow-ups that were consciously left for V4.1.

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

_(How that held: the token change landed as planned; the conversational endpoint
turned out to be unnecessary because the web's assistant chat already covers it,
so the only other backend addition is the native Google sign-in handoff. Still
no breaking changes and no migrations.)_

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

## 5. V4-3 — Design system in React Native (NativeWind) — SHIPPED

Shipped: every `@lifedeck/ui` primitive now has an RN counterpart in
`apps/mobile/src/components/ui` with the same prop API — Button, Card, Badge,
TextField, PasswordField, Skeleton, EmptyState, Avatar, ProgressBar, Dialog
(→ Modal, `center` | `sheet`), Toast, Tabs, TaskCheckbox, Logo/LogoMark — plus
four RN-only primitives the web gets from the DOM (`Screen` for the page shell,
`Row` for grouped list rows, `Select` for `<select>`, `Switch` for a toggle).
The web icon set is ported 1:1 to `react-native-svg` in
`apps/mobile/src/components/icons.tsx`.

**Tokens follow the device theme, like the web.** The plan assumed NativeWind
could parse the oklch values directly; it cannot at runtime, so the tokens are
pre-converted to sRGB channels in `src/theme/palette.json` (both the light set
and the dark overrides) and declared as CSS variables in `src/global.css`,
including the `@media (prefers-color-scheme: dark)` block. `tailwind.config.js`
maps every color to `rgb(var(--color-x) / <alpha-value>)`, so a class like
`bg-brand-600` or `bg-success/15` inverts on device exactly as it does on the
web. `useThemeColors()` resolves the same tokens for native props NativeWind
cannot reach (navigation theming, `placeholderTextColor`, SVG fills).

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

## 6. V4-4 — Screen parity (port every route) — SHIPPED

One RN screen per web route, same data, same states (loading skeleton / error /
empty / content). All of them are in:

| Web route | Mobile screen | Notes |
|-----------|---------------|-------|
| `/` | `(tabs)/index` — Today / daily board | greeting, day stepper, progress ring, leftovers, add-task, task list |
| `/lists`, `/lists/[id]` | `(tabs)/lists`, `lists/[id]` | today card, per-list progress, rename/delete/leave, share |
| `/habits` | `habits` | trailing-week bar (each day toggles), streak badge, cadence form, Free upsell |
| `/recurring` | `recurring` | rule editor (freq / interval / weekdays / monthday / start / until) |
| `/calendar` | `calendar` | agenda + month, week strip, event editor, detail sheet, find-time, connections |
| `/analytics` | `analytics` | weekly/monthly/yearly buckets, trend, streak, habit consistency |
| `/settings` (+ `/billing`) | `(tabs)/profile` hub → `settings?section=…`, `billing` | see IAP note |
| `/developers` | `developers` | API keys, scopes, one-time secret |
| `/generate` | `(tabs)/assistant` | the assistant chat — V4-5 |
| `/share/[token]` | `share/[token]` | deep link, no tab shell |

**Reordering** is the one interaction that is deliberately *not* a port. The web
drags rows with dnd-kit; inside a scroll view that needs a gesture library and
fights the list's own pan, so the app uses the pattern native settings screens
use — long-press puts the list in reorder mode, where each row gets explicit
move controls (`ReorderableList`). It hits the same `PATCH /lists/:id/tasks`
endpoint and is the accessible option, since a drag has no screen-reader
equivalent.

Two other places diverge for platform reasons, both noted in the code: the
avatar upload sends decoded base64 bytes from the image picker instead of a
resized `Blob`, and the WhatsApp pairing card drops the web's QR fallback (on a
phone the deep link always works, and the code is still shown for manual
sending).

---

## 7. V4-5 — Generate → chat (web + app) — SHIPPED, by a different route

The goal was "the one-shot brief form becomes a WhatsApp-style conversation on
both platforms". That happened on the web while V4 was in flight, through the
**in-app assistant chat** (`feat: add in-app assistant chat`, then photo +
voice): `/generate` stopped rendering `ai-generator.tsx` and now renders
`AssistantChat`, a multi-turn thread with tool-call receipt cards — including
`createList`, which is what the planned `proposeList` tool was for.

So V4-5 closed as:

- **No new endpoint.** `POST /api/v1/assistant/chat` already does what the
  planned `/lists/generate/chat` would have: it chats, calls tools, and returns
  `{ text, actions }`. It is the *general* assistant rather than a
  list-generation-only chat, which is strictly more capable. The plan's
  stateless / no-new-tables / no-Neon-cost constraint holds — the assistant chat
  keeps its history in Redis, not Postgres.
- **App side shipped here**: `(tabs)/assistant` is the RN port of the web chat —
  same turn model (text / photo / voice), same action cards, same locked and
  quota upsells. `MediaRecorder` becomes `expo-audio`, the file input becomes
  `expo-image-picker`, and both upload through RN's `FormData` file streaming.
  No streaming client is needed: the web chat is request/response
  (`useSendAssistantMessage`), not `useChat`, so the `expo/fetch` streaming risk
  in section 10 never materialized.
- **`ai-generator.tsx` deleted.** Nothing imported it once `/generate` switched
  to the chat. `POST /api/v1/lists/generate` and its `useGenerateList` /
  `useSaveDraftList` hooks stay: they are part of the documented public REST
  surface, not dead code.

The original design, for the record:

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
- **Streaming in RN.** ~~Depends on `expo/fetch`~~ — moot. The assistant chat is
  request/response, not streamed, so the app needed no streaming client.
- **IAP.** Deferred to V4.1; V4 sends billing to the web.
- **Push notifications** (Expo Notifications) — deferred to V4.1. Proactive
  messages still reach the user over WhatsApp and the in-app notification bell.
- **Offline.** V4 assumes an online thin client; React Query cache only. No
  offline-first sync.
- **Metro + pnpm resolution** (found while validating the bundle): Metro walks
  plain `node_modules` directories, which pnpm's isolated store does not
  provide. Two fixes landed and both matter for anyone touching the app:
  `disableHierarchicalLookup` is now OFF (it assumes a hoisted layout, so it
  broke every transitive import), and packages our own source imports through a
  toolchain — `@expo/metro-runtime`, `react-native-css-interop` — are declared
  as direct dependencies of `apps/mobile`.

---

## 11. Progress log

**As of 2026-07-27 (branch `v4`): V4 is complete — the app is built and every
route in section 6 is ported.** What follows is per-phase.

- **V4-0 — done.** `apps/mobile` on Expo SDK 57 (RN 0.86, React 19.2), Expo
  Router + NativeWind, Metro wired for the pnpm monorepo. Design tokens mirrored
  from `styles.css` to `src/theme/palette.json`. Support fixes: pinned
  `typescript` in `@lifedeck/config` and an `@types/react` override to keep the
  workspace on one version.
- **V4-1 — done.** Backend is additive: `getUserIdFromRequest` also accepts the
  session JWT via `Authorization: Bearer`; `okSession` returns the token as a
  sibling of `data` from the guest and sign-in routes (web keeps using the
  cookie). App stores the token in SecureStore, boots a guest session through
  `SessionGate`, and now also does full email register / verify / sign-in.
  **Google sign-in works on native** through a single-use code: `/auth/google`
  takes `platform=native`, the callback stores the session token in Redis under
  a 2-minute one-time code and deep-links `lifedeck://auth?code=…`, and
  `POST /auth/native` trades that code for the token over HTTPS. The token
  itself never travels through the custom-scheme URL, which any app on the
  device could claim.
- **V4-2 — done, scoped to the transport.** `packages/client` holds the shared
  `createApiClient` factory + `ApiError` (100% covered, including the multipart
  path the assistant chat needs). Web and mobile both consume it.
  **Hook sharing stopped at the transport, deliberately.** The data hooks are
  ported into `apps/mobile/src/lib/api` as near-verbatim copies rather than
  moved into `packages/client` — the "extraction noise" fallback in section 10.
  The reason: web hooks import `apiRequest` as a module singleton, and the web's
  ~25 hook test files mock exactly that module. Sharing them means introducing a
  client-injection seam and rewriting every one of those tests, which is real
  churn against a 95% gate for zero user-visible gain. To keep the copies
  cheap to diff, the mobile client's base URL excludes `/api/v1`, so the hook
  bodies are character-for-character identical to the web's; each file says so
  at the top. Genuinely platform-coupled hooks (`use-session`, `use-auth`,
  `use-account`, `use-assistant`) diverge and say why.
- **V4-3 — done.** See section 5: every primitive, the icon set, and
  device-following dark mode.
- **V4-4 — done.** See section 6 for the route table and the three deliberate
  divergences.
- **V4-5 — done, via the assistant chat.** See section 7.

**Validated by bundling, not yet on a real device.** `pnpm check` is green
across all 8 packages (lint + typecheck + format + 2177 tests at the 95%
coverage gate), and — new in this pass — `expo export` now succeeds for **both
iOS (1854 modules) and Android (1954 modules)**, which is what caught the Metro
resolution bugs in section 10. Still ahead: running it on a simulator/device
against the deployed backend, and EAS Build/Submit to the stores.

**Follow-ups, none blocking:**

- Component-level tests for the app. The mobile package has a vitest setup and a
  100%-covered pure-module suite (dates, calendar ranges, base64, weekday
  labels, `cn`, prices), but screens are RN trees that need a native renderer
  (jest-expo / RNTL) rather than jsdom; they are covered by typecheck, lint and
  the bundle today. `vitest.config.ts` records the scope and why.
- Universal links. Deep links use the `lifedeck://` scheme; associating the web
  domain (`applinks` / `assetlinks.json`) needs the store build and is part of
  the EAS step.
- Native IAP and push notifications, both explicitly V4.1.
