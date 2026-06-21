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

- [ ] GitHub Actions CI: install, lint, typecheck, coverage, build on PRs.
- [ ] Wire `eslint-config-next` flat config into `apps/web` (remove plugin warning).
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

- [ ] Guest sessions: create a user from a display name; signed `HttpOnly` cookie.
- [ ] Session middleware + `requireUser` helper.
- [ ] Upgrade guest -> registered (email + password).
- [ ] Email verification code flow (Resend template).
- [ ] Google OAuth sign-in.
- [ ] Account settings: rename, change password, sign out, delete account.

## Phase 4 - Lists & tasks (core)

- [ ] Use cases: create/rename/delete list; list lists; get list with tasks.
- [ ] Daily list: auto-provision per day; carry-over rules.
- [ ] Task use cases: reorder, edit, reopen, observation, assignee.
- [ ] REST endpoints for all of the above + OpenAPI entries.
- [ ] React Query hooks + optimistic updates in the UI.

## Phase 5 - Sharing & collaboration

- [ ] Share link generation with role (viewer/editor) and optional expiry.
- [ ] Public read-only view ("See my wedding steps on TaskIn").
- [ ] Join a list via link (guest or registered).
- [ ] Members management UI; per-item private toggle on the daily list.
- [ ] Real-time or near-real-time updates (polling first, then live).

## Phase 6 - Analytics

- [ ] Completion metrics use cases (daily, weekly, monthly).
- [ ] Analytics endpoints + caching.
- [ ] Analytics screen with charts and big legible numbers.

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

---

### Working agreement

- One step at a time, each behind a PR that keeps `main` green.
- Every feature: tests + docs + OpenAPI (if API) + responsiveness (if UI).
- No inline code comments; intent goes in `docs/`.
