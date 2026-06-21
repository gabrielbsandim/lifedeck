<div align="center">

# TaskIn

**A shareable, multilingual to-do platform built with clean architecture.**

Plan your day, build standalone lists, share them with a link, and follow simple
analytics. No account required to start, optional account when you want more.

[![CI](https://github.com/gabrielbsandim/taskin/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrielbsandim/taskin/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

</div>

---

## Highlights

- **Daily list + standalone lists** with status, observations, and per-item assignees.
- **Frictionless start** - just type your name. Upgrade to a full account anytime
  (email + password with verification code, or Google).
- **Sharing** - invite people to collaborate or share a read-only public link.
- **Analytics** - completion rates with daily, weekly, and monthly breakdowns.
- **White-label REST API** - versioned, documented with OpenAPI, ready to embed.
- **Multilingual** - locale auto-detected from the browser, English fallback.
- **Delightful UI** - responsive from the first pixel with smooth, subtle motion.

## Tech stack

| Area          | Choice                                                         |
| ------------- | -------------------------------------------------------------- |
| Frontend      | Next.js 16 (App Router), React 19, TypeScript, TanStack Query  |
| Styling       | Tailwind CSS 4, Framer Motion, custom design system            |
| Backend / API | Next.js Route Handlers, REST `/api/v1`, Zod, OpenAPI + Scalar  |
| Persistence   | Prisma 7 + Neon (serverless Postgres)                          |
| Email         | Resend with typed templates                                    |
| i18n          | next-intl                                                      |
| Testing       | Vitest + Testing Library (95% coverage gate)                   |
| Tooling       | pnpm workspaces, Turborepo, ESLint, Prettier                   |
| Hosting       | Vercel (web + API), Neon (database)                            |

## Monorepo layout

```
taskin/
├── apps/
│   └── web/              Next.js app: UI + white-label REST API (/api/v1)
├── packages/
│   ├── domain/          Entities, value objects, domain errors (pure, no deps)
│   ├── application/     Use cases, ports (interfaces), DTOs
│   ├── infrastructure/  Prisma repositories, Resend email, adapters
│   ├── ui/              Design system (React + Tailwind + Framer Motion)
│   ├── i18n/            Locale messages and detection
│   └── config/          Shared tsconfig, eslint, prettier presets
└── docs/                Architecture, API, security, testing, design, i18n
```

Dependencies flow inward: `domain` knows nothing about frameworks; `application`
depends on `domain`; `infrastructure` and `apps/web` depend on both through
interfaces. See [docs/architecture.md](./docs/architecture.md).

## Getting started

```bash
# Requires Node >= 24 and pnpm >= 9 (enable with: corepack enable)
pnpm install
cp .env.example .env      # then fill in the values
pnpm dev                  # starts the web app on http://localhost:3000
```

Useful scripts:

```bash
pnpm lint            # lint every package
pnpm typecheck       # type-check every package
pnpm test            # run unit tests
pnpm test:coverage   # run tests with the 95% coverage gate
pnpm check           # lint + typecheck + format:check + coverage (CI parity)
```

More detail in [docs/getting-started.md](./docs/getting-started.md).

## Documentation

- [Architecture](./docs/architecture.md)
- [API reference](./docs/api.md)
- [Security](./docs/security.md)
- [Testing](./docs/testing.md)
- [Design system](./docs/design-system.md)
- [Internationalization](./docs/i18n.md)
- [Contributing](./CONTRIBUTING.md)
- [Development plan](./DEVELOPMENT_PLAN.md)

## License

[MIT](./LICENSE) © Gabriel Sandim
