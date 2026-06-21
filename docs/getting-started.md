# Getting started

## Prerequisites

- **Node.js >= 24** (`.nvmrc` pins the major version; run `nvm use`).
- **pnpm >= 9** (`corepack enable` activates the version pinned in `package.json`).
- A **Neon** Postgres database (free tier is enough).
- A **Resend** account for transactional email (optional in development).

## Install

```bash
corepack enable
pnpm install
cp .env.example .env
```

Fill in `.env`. The minimum to boot the UI is `AUTH_SECRET`; the database is only
required once you exercise persistence-backed endpoints.

## Run

```bash
pnpm dev            # all apps in watch mode via Turborepo
```

The web app is served at http://localhost:3000. The API lives under
`/api/v1`, and interactive API docs render at `/docs`.

## Database

The Prisma schema lives in `packages/infrastructure/prisma/schema.prisma`.

```bash
pnpm --filter @taskin/infrastructure db:generate   # regenerate the client
pnpm --filter @taskin/infrastructure db:migrate     # create/apply a dev migration
pnpm --filter @taskin/infrastructure db:studio      # open Prisma Studio
```

## Quality gates

These mirror CI exactly. Run them before pushing.

```bash
pnpm lint            # ESLint across every package
pnpm typecheck       # tsc --noEmit across every package
pnpm test            # Vitest (unit)
pnpm test:coverage   # Vitest with the 95% coverage threshold
pnpm format:check    # Prettier verification
pnpm check           # everything above, in one command
```

## Deployment (Vercel + Neon)

1. Import the repository on Vercel and set the project **root directory** to `apps/web`.
2. Add the environment variables from `.env.example` to the Vercel project.
3. Provision Neon (directly or via the Vercel Marketplace) and set `DATABASE_URL`.
4. The build runs `next build`; `prisma generate` runs automatically on install.

## Workspace layout

| Path                       | Package                  | Responsibility                       |
| -------------------------- | ------------------------ | ------------------------------------ |
| `apps/web`                 | `@taskin/web`            | UI + REST API + composition root     |
| `packages/domain`          | `@taskin/domain`         | Entities, value objects, errors      |
| `packages/application`     | `@taskin/application`    | Use cases, ports, DTOs               |
| `packages/infrastructure`  | `@taskin/infrastructure` | Prisma, Resend, adapters             |
| `packages/ui`              | `@taskin/ui`             | Design system                        |
| `packages/i18n`            | `@taskin/i18n`           | Locale detection + messages          |
| `packages/config`          | `@taskin/config`         | Shared tooling presets               |
