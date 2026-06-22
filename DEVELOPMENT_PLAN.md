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
- [x] Daily list: auto-provision per day; carry-over of unfinished tasks.
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

## Phase 5 - Sharing & collaboration

- [x] Share link generation with role (viewer/editor) and optional expiry.
- [x] Public read-only view ("See my wedding steps on TaskIn").
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
      mockups were generated from the existing `styles.css` + `@taskin/ui`, so tokens and
      components were already in sync. Added the named motion-duration tokens
      (`--duration-fast/base/slow`) and the small drift fixes (TextField 1.5px border + error
      tint, Dialog sheet drag handle). Stage-2 screens already exist and match; optional
      enhancements not yet pulled in: per-row assignee avatar + inline observation, desktop
      sidebar nav.
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

- [ ] Integrate `next-intl` (locale routing, date/number formatting).
- [ ] Language switcher; persist preference per user.
- [ ] Translate all product copy (en, pt); extract remaining strings.

## Phase 9 - Email & notifications

- [ ] Resend templates: verification, invitation, list digest.
- [ ] Optional notifications (assignment, shared list activity).

## Phase 10 - White-label API maturity

- [ ] API keys / tokens for third-party consumers.
- [ ] Per-key rate limiting and scopes.
- [ ] Generate OpenAPI from Zod schemas automatically (single source of truth).
- [ ] Self-host Scalar docs; publish a usage guide.

## Phase 11 - Security & compliance

- [ ] Full security headers + CSP in `next.config`.
- [ ] Argon2id password hashing; brute-force protection.
- [ ] Data export and deletion (user data rights).
- [ ] Security review + dependency scanning in CI.

## Phase 12 - Launch readiness

- [ ] E2E tests (Playwright) for critical flows.
- [ ] Performance pass (Core Web Vitals, bundle budget).
- [ ] Error monitoring + structured logging.
- [ ] SEO/meta, social share cards, favicon, PWA manifest.
- [ ] Production launch on Vercel + Neon.

## Phase 13 - Mobile app (Expo) - future

Not started until the web product is mature and validated. The clean
architecture already positions for this (see
[docs/architecture.md](./docs/architecture.md), "Clients").

- [ ] `apps/mobile` with Expo / React Native (iOS + Android).
- [ ] Reuse `@taskin/domain`, `@taskin/application`, `@taskin/i18n` unchanged.
- [ ] `@taskin/ui-native` design system mirroring the web tokens.
- [ ] Bearer-token auth flow against `/api/v1` (no cookies on mobile).
- [ ] Store submission (App Store + Play Store), OTA updates.

---

### Working agreement

- One step at a time, each behind a PR that keeps `main` green.
- Every feature: tests + docs + OpenAPI (if API) + responsiveness (if UI).
- No inline code comments; intent goes in `docs/`.
