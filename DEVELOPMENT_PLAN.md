# Development plan

Incremental roadmap from the current scaffold to a complete product. Each step is
small, independently shippable, and ends green (`pnpm check` passes, coverage
>= 95%). Check items off as they land.

Legend: **[x]** done · **[ ]** todo.

## Phase 0 - Foundation (done)

- [x] Monorepo with pnpm workspaces + Turborepo.
- [x] Clean architecture as packages (domain, application, infrastructure).
- [x] Shared config: tsconfig, ESLint (flat), Prettier, Vitest presets.
- [x] 95% coverage gate wired from the first commit.
- [x] Domain core: `Task`, `Email`, `TaskStatus`, guards, errors + tests.
- [x] Application core: ports, DTOs (Zod), `createTask`/`completeTask` + tests.
- [x] Infrastructure: Prisma schema + Neon client, repository, Resend sender,
      clock/uuid adapters + tests.
- [x] i18n: browser detection with English fallback + catalogs (en, pt).
- [x] Design system seed: `Button`, `TaskCheckbox`, `cn` + tests.
- [x] Next.js app: home preview, `/api/v1` (health, tasks, openapi), `/docs`.
- [x] Docs: architecture, getting-started, api, security, testing, design, i18n.
- [x] Design brief for Claude Design.

## Phase 1 - Tooling & CI hardening

- [x] GitHub Actions CI: install, lint, typecheck, coverage, build on PRs.
- [x] Wire `eslint-config-next` flat config into `apps/web` (remove plugin warning).
- [x] Add `pnpm audit` (prod / high) + dependency review to CI.
- [x] Commitlint + Conventional Commits check (commit-msg hook + CI on PRs).
- [x] Vercel project linked and deployed (preview-on-PR not yet confirmed).
- [x] Neon database provisioned; `DATABASE_URL` set in Vercel + GitHub Secrets.

## Phase 2 - Data model & persistence

- [x] Finalize Prisma schema for v1 (users, lists, tasks, members, share links,
      recurring tasks, email verifications).
- [x] First migration (`0_init` … `3_email_verifications`, applied via CI).
- [x] Seed script (`prisma db seed`, idempotent demo data).
- [x] Repository implementations: `ListRepository`, `UserRepository`,
      `MembershipRepository`, `ShareLinkRepository` (+ recurring, email
      verification, analytics).
- [x] Integration tests against a real Postgres (CI service container; runs
      separately from the unit coverage gate).

## Phase 3 - Identity (no-account-first)

- [x] Guest sessions: create a user from a display name; signed `HttpOnly` cookie.
- [x] Session middleware + `requireUser` helper (`getUserIdFromRequest`).
- [x] Upgrade guest -> registered (email + password); `ScryptPasswordHasher`.
- [x] Email verification code flow (6-digit code, Resend template + console
      fallback for local dev). See `docs/auth.md`.
- [x] Google OAuth sign-in (`GoogleOAuthProvider`, CSRF state cookie).
- [x] Account settings: rename, change password, sign out, delete account.

## Phase 4 - Lists & tasks (core)

- [x] Use cases: create / rename / delete list; list lists; get list with tasks.
- [x] Daily list: auto-provision per day; carry-over of unfinished tasks
      (reworked in Phase 4.6 into a per-user manual/auto copy model).
- [x] Task use cases: reorder, edit, reopen, observation, assignee.
- [x] REST endpoints for all of the above + OpenAPI entries.
- [x] React Query hooks + optimistic updates for task completion.

## Phase 4.5 - Recurring tasks (daily lists)

- [x] Domain: `RecurrenceRule` value object + pure `occursOn(rule, date)`
      predicate (daily / weekly-by-weekday / monthly, interval, until).
- [x] Domain: `RecurringTask` entity (owner, title, rule); `Task` gains an
      optional `recurringTaskId` link.
- [x] Persistence: `recurring_tasks` table + `tasks.recurring_task_id` migration;
      `RecurringTaskRepository`.
- [x] Use case: materialize the daily board for a date (auto-provision + lazy
      instance generation from matching definitions).
- [x] REST endpoints: manage recurring definitions (`/api/v1/recurring-tasks`);
      daily board by date (`/api/v1/daily?date=`).
- [x] See `docs/recurrence.md` for the full design.

## Phase 4.6 - Carry-over rework (per-user, copy not move)

- [x] Carry-over is now a per-user setting (`carryOverMode`: `manual` default, or
      `auto`), replacing the old auto-move. Past days keep their unfinished tasks
      as an honest record instead of being emptied.
- [x] Domain: `User.carryOverMode` (+ `CarryOverMode` VO); `Task.carriedFromDate`
      (origin day of a copy) and `carriedForwardAt` (freezes the source so it stops
      nagging as a candidate). Migration `6_carry_over`.
- [x] `manual`: the daily board returns carry-over candidates (prior pending,
      non-recurring, not-yet-carried); the UI shows a "yesterday's leftovers"
      section with a per-task "bring to today". `auto`: candidates are copied into
      today automatically and the sources frozen.
- [x] `bringTaskToToday` use case + `POST /api/v1/tasks/{id}/carry-forward`;
      `setCarryOverMode` + `PATCH /api/v1/account/carry-over`; account toggle.
      Copies carry the title, note, and a "brought from {date}" reference.

## Phase 5 - Sharing & collaboration

- [x] Share link generation with role (viewer/editor) and optional expiry.
- [x] Public read-only view ("See my wedding steps on Lifedeck").
- [x] Join a list via link (guest or registered).
- [x] Members management UI; per-item private toggle on the daily list.
- [x] Task assignees (assign to a member or the owner).
- [x] Near-real-time updates (10s polling). Live push is a future enhancement.

## Phase 6 - Analytics

- [x] Completion metrics use case: daily series over a window (7/30/90),
      totals, completion rate, and current streak (`getAnalytics`).
- [x] Analytics endpoint (`GET /api/v1/analytics?days=`) + OpenAPI entry.
      Server-side caching is deferred; TanStack Query caches on the client.
- [x] Analytics screen with a per-day bar chart and big legible numbers.

## Phase 6.5 - AI list generation

See [docs/ai-generation.md](./docs/ai-generation.md) for the full design.

- [x] `ListGenerator` port in the application layer + `GenerationBrief` / `GeneratedPlan` Zod schemas.
- [x] `generateList` use case (validate brief -> generate -> validate plan -> draft).
- [x] Provider-agnostic `AiSdkListGenerator` behind the `ListGenerator` port, built on the
      Vercel AI SDK (`generateObject` + AI Gateway). Provider/model is the `AI_MODEL` string
      (`anthropic/claude-opus-4-8`, `google/gemini-2.5-flash`, `openai/...`); unset falls back
      to `StubListGenerator` offline. Switching providers is an env change, not a code change.
- [x] `FakeListGenerator` + unit tests (happy path, clamped output, rejected output).
- [x] `POST /api/v1/lists/generate` endpoint + OpenAPI entry; returns an editable draft.
- [x] UI: guided questions + description, edit-then-save flow (`/generate`). Token-by-token
      streaming of the draft is deferred to the Phase 7 motion pass.
- [ ] Rate limiting + per-plan generation quotas (monetization hook). Deferred until the
      quota/billing model lands; the endpoint requires an authenticated user today.
- [x] Prompt-injection safeguards (user text as data, fixed system prompt).

## Phase 7 - Polish: design & motion

- [x] Reconcile the codebase with the Claude Design deliverables (`design/*.dc.html`). The
      mockups were generated from the existing `styles.css` + `@lifedeck/ui`, so tokens and
      components were already in sync. Added the named motion-duration tokens
      (`--duration-fast/base/slow`) and the small drift fixes (TextField 1.5px border + error
      tint, Dialog sheet drag handle). Stage-2 screens already existed and matched. Pulled in
      the remaining mockup details: per-row assignee avatar (accessible native-select overlay)
      + inline editable note, and a desktop sidebar navigation shell (`AppShell`/`AppSidebar`,
      `lg+` only; mobile keeps the top nav). Verified at 360px and 1280px.
- [x] Completion micro-animations + 100% celebration. `TaskCheckbox` (spring check) and
      `ProgressBar` (animated fill + 100% glow) already animate; added a `Celebration`
      particle burst that fires once on the 100% transition, wired into the daily board and
      standalone lists, and honoring `prefers-reduced-motion`.
- [x] Empty / loading (skeleton) / error states for every screen. Audited all screens;
      added the missing error + retry state to the lists and recurring-tasks managers
      (the rest already had loading skeletons, empty states, and error/retry).
- [x] Responsiveness pass at all breakpoints; reduced-motion support. Daily-board action nav
      wraps instead of overflowing; the task row stacks its controls under the title on mobile
      and goes inline on `sm+`; list/standalone headers truncate long titles. Verified 0
      horizontal overflow at 360px across `/`, `/lists`, `/generate`, `/analytics`, `/recurring`.
      Reduced-motion is honored by the celebration; remaining micro-animations are subtle springs.

## Phase 8 - Internationalization (full)

Approach: locale follows the browser. The server resolves it from `Accept-Language`
(SSR-friendly, no hydration flash) and the client forwards the browser language as
`Accept-Language` on every API call, so the backend localizes its own output too. This
mirrors the team convention (browser language + `Accept-Language` propagation) without a
client-side i18next rewrite, and keeps the typed message catalogs for compile-time safety.

- [x] ~~next-intl / locale routing~~ — deliberately skipped. The typed SSR catalogs already
      resolve from `Accept-Language`; URL-based locale routing isn't wanted for this app.
      Browser-tag resolution uses an explicit fallback map (`resolveLocale`, codebox-style).
- [x] ~~Language switcher~~ — deliberately skipped. Locale follows the browser (like the
      reference project); no manual override to persist.
- [x] Translate all product copy (en, pt); extract remaining strings. Extracted the task-row
      and share-dialog literals into the catalogs; swept the app for remaining hardcoded copy.
- [x] Backend localizes from `Accept-Language`: the verification email renders in the
      requester's locale (`renderEmail(template, locale)`), threaded from the auth routes.
- [x] Date formatting via `Intl` with the active locale (daily board / shared board headers).

## Phase 9 - Email & notifications

- [x] Resend templates (localized, HTML-escaped): verification, invitation, task
      assignment, and daily digest. Console fallback locally.
- [x] Invite collaborators by email (`POST /api/v1/lists/{id}/invite`) + share-dialog UI.
- [x] Daily digest email + trigger endpoint (`POST /api/v1/digest`); scheduled delivery
      (Vercel Cron) is left for infra setup.
- [x] In-app notifications: `Notification` entity + table, repository, list/mark-read use
      cases, `GET/POST /api/v1/notifications*`, and a header bell with unread count + polling.
      Task assignment creates both an email (if the assignee has one) and an in-app
      notification (so guests are notified too).

## Phase 10 - White-label API maturity

- [x] API keys / tokens for third-party consumers. Personal access tokens
      (`ApiKey` entity, `api_keys` table, SHA-256-hashed secret shown once,
      `tk_live_` prefix). Sent as `Authorization: Bearer` or `X-API-Key`;
      managed under `/api/v1/api-keys*` (session-only) and the `/developers` UI.
- [x] Per-key rate limiting and scopes. Scopes (`tasks:read/write`,
      `lists:read/write`, `analytics:read`) enforced per resource endpoint via
      `requireScope`; rate limiting per key via Upstash Redis (sliding window,
      graceful no-op without `UPSTASH_*`).
- [x] Generate OpenAPI from Zod schemas automatically (single source of truth).
      `@asteasolutions/zod-to-openapi` registers the real DTO schemas + paths;
      `GET /api/v1/openapi` is generated, not hand-maintained.
- [x] Self-host Scalar docs; publish a usage guide. Scalar already self-hosted at
      `/docs`; `docs/api.md` documents auth, scopes, rate limits, and a quickstart.

## Phase 11 - Security & compliance

- [x] Full security headers + CSP. Static headers (HSTS, X-Frame-Options DENY,
      nosniff, Referrer-Policy, Permissions-Policy) in `next.config`; a strict
      nonce-based CSP (`script-src 'self' 'nonce' 'strict-dynamic'`) in `proxy.ts`
      (Next 16 proxy convention). Scalar is self-hosted (`public/scalar`, vendored
      at build) so the CSP needs no external script origin. Verified the app
      hydrates and `/docs` renders under the CSP in a browser.
- [x] Argon2id password hashing; brute-force protection. `Argon2PasswordHasher`
      (`@node-rs/argon2`) with transparent scrypt -> argon2id rehash on the next
      successful sign-in. Auth endpoints (sign-in / register / verify / resend)
      are rate limited per IP+identity via Upstash (stricter window than the API).
- [x] Data export and deletion (user data rights). Account deletion already
      cascades; added `GET /api/v1/account/export` (`exportUserData`) returning a
      JSON download of the profile, lists+tasks, recurring tasks, share links,
      notifications, and API keys, plus an "Export my data" action in account.
- [x] Security review + dependency scanning in CI. `pnpm audit --prod` and
      dependency review already ran; added a CodeQL workflow (security-extended)
      on push / PR / weekly schedule.

## Phase 12 - Launch readiness

- [x] E2E tests (Playwright) for critical flows. `playwright.config.ts` + an
      `e2e/` suite (guest onboarding -> add task -> complete -> 100%; public API
      reference renders), run in CI against an ephemeral `postgres:16` service.
      The Prisma client now uses the Neon adapter only for Neon URLs and a plain
      client otherwise, so E2E/self-host can target any Postgres.
- [x] Performance pass (Core Web Vitals). A `WebVitals` reporter beacons each
      metric to `POST /api/v1/vitals`, which logs it structured (same-origin, CSP
      friendly). System fonts (no web-font cost); bundle stays lean.
- [x] Error monitoring + structured logging. `@sentry/nextjs` wired via
      `instrumentation` (server/edge) + `instrumentation-client`, enabled only when
      a DSN is set; `handleError` captures unhandled errors and logs structured
      JSON. CSP `connect-src` allows the Sentry ingest origin.
- [x] SEO/meta, social share cards, favicon, PWA. Rich metadata + dynamic
      OpenGraph image, `robots`/`sitemap`, apple-icon, and an installable,
      offline-capable PWA (Serwist service worker precaching the shell; `/api`
      stays network-only). Verified the SW registers under the strict CSP.
- [ ] Production launch on Vercel + Neon. Code is launch-ready; the remaining
      step is operational (set `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`,
      `NEXT_PUBLIC_SITE_URL`, and promote).

## Phase 12.5 - Account & auth UX polish

Surfaced from real use after Google sign-in shipped.

- [ ] Show/hide password toggle ("eye" icon) on every password field (sign-in,
      register, and the account "current/new password" inputs). There is no
      confirm-password field, so letting the user reveal what they typed is the
      minimum safeguard against typos.
- [ ] Hide the "Change password" section for OAuth-only accounts (users who signed
      up with Google have no local password to change). Gate it on whether the
      account has a password credential set.

## Phase 12.6 - Launch readiness & portfolio polish

Surfaced while preparing Lifedeck for a public, portfolio-grade launch.

- [ ] Terms of Use + Privacy Policy pages (localized), linked from the footer and
      from the sign-up flow.
- [ ] Footer ownership/branding on the landing page: show that Lifedeck belongs to
      GBS Tecnologia da Informação Ltda (CNPJ 44.000.992/0001-22, contact email),
      with a copyright line. Reference: the Obra Nova landing-page footer.
- [ ] Full manual QA pass with Playwright MCP: exercise every single feature, screen,
      UI/UX detail, and responsive breakpoint - exhaustively, nothing skipped.
- [ ] Add Spanish (es) as a third first-class locale alongside English and Portuguese
      (catalogs, `resolveLocale` map, backend `Accept-Language` localization).
- [ ] Documentation overhaul: critically review every doc - the white-label API docs,
      README, all `*.md` - so the whole project reads polished and professional.
- [ ] Full code review: read every file and line, fix any issue, and ensure the
      codebase reflects current industry best practices (it is a portfolio project).

## Phase 13 - Mobile app (Expo) - future

Not started until the web product is mature and validated. The clean
architecture already positions for this (see
[docs/architecture.md](./docs/architecture.md), "Clients").

- [ ] `apps/mobile` with Expo / React Native (iOS + Android).
- [ ] Reuse `@lifedeck/domain`, `@lifedeck/application`, `@lifedeck/i18n` unchanged.
- [ ] `@lifedeck/ui-native` design system mirroring the web tokens.
- [ ] Bearer-token auth flow against `/api/v1` (no cookies on mobile).
- [ ] Store submission (App Store + Play Store), OTA updates.

---

### Working agreement

- One step at a time, each behind a PR that keeps `main` green.
- Every feature: tests + docs + OpenAPI (if API) + responsiveness (if UI).
- No inline code comments; intent goes in `docs/`.
