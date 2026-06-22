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
- [ ] Add `pnpm audit` + dependency review to CI.
- [ ] Commitlint + Conventional Commits check.
- [ ] Vercel project linked; preview deploys on PRs.
- [ ] Neon database provisioned; `DATABASE_URL` set in Vercel.

## Phase 2 - Data model & persistence

- [ ] Finalize Prisma schema for v1 (users, lists, tasks, members, share links).
- [ ] First migration + seed script.
- [ ] Repository implementations: `ListRepository`, `UserRepository`,
      `MembershipRepository`, `ShareLinkRepository`.
- [ ] Integration tests against a Neon branch (covered separately from unit gate).

## Phase 3 - Identity (no-account-first)

- [x] Guest sessions: create a user from a display name; signed `HttpOnly` cookie.
- [x] Session middleware + `requireUser` helper (`getUserIdFromRequest`).
- [x] Upgrade guest -> registered (email + password); `ScryptPasswordHasher`.
- [x] Email verification code flow (6-digit code, Resend template + console
      fallback for local dev). See `docs/auth.md`.
- [x] Google OAuth sign-in (`GoogleOAuthProvider`, CSRF state cookie).
- [x] Account settings: rename, change password, sign out, delete account.

## Phase 4 - Lists & tasks (core)

- [ ] Use cases: create/rename/delete list; list lists; get list with tasks.
- [ ] Daily list: auto-provision per day; carry-over rules.
- [ ] Task use cases: reorder, edit, reopen, observation, assignee.
- [ ] REST endpoints for all of the above + OpenAPI entries.
- [ ] React Query hooks + optimistic updates in the UI.

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

- [ ] Completion metrics use cases (daily, weekly, monthly).
- [ ] Analytics endpoints + caching.
- [ ] Analytics screen with charts and big legible numbers.

## Phase 6.5 - AI list generation

See [docs/ai-generation.md](./docs/ai-generation.md) for the full design.

- [ ] `ListGenerator` port in the application layer + `GenerationBrief` / `GeneratedPlan` Zod schemas.
- [ ] `generateList` use case (validate brief -> generate -> validate plan -> draft).
- [ ] `ClaudeListGenerator` adapter in infrastructure (structured output, prompt caching).
- [ ] `FakeListGenerator` + unit tests (happy path, clamped output, rejected output).
- [ ] `POST /api/v1/lists/generate` endpoint + OpenAPI entry; returns an editable draft.
- [ ] UI: guided questions + description, streamed draft, edit-then-save flow.
- [ ] Rate limiting + per-plan generation quotas (monetization hook).
- [ ] Prompt-injection safeguards (user text as data, fixed system prompt).

## Phase 7 - Polish: design & motion

- [ ] Implement the Claude Design screens in `@taskin/ui`.
- [ ] Completion micro-animations + 100% celebration.
- [ ] Empty / loading (skeleton) / error states for every screen.
- [ ] Responsiveness pass at all breakpoints; reduced-motion support.

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
