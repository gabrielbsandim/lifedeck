# Architecture

Lifedeck follows **clean architecture**. Dependencies point inward: outer layers
know about inner layers, never the reverse. Each layer is an isolated workspace
package, so the boundary is enforced by the dependency graph itself, not by
convention.

```
┌──────────────────────────────────────────────────────────────┐
│  apps/web  (Next.js: UI, REST API, composition root)          │
│  packages/ui  ·  packages/i18n                                 │
│      │ depends on                                              │
│      ▼                                                          │
│  packages/infrastructure  (Prisma, Neon, Resend, adapters)     │
│      │ implements the ports declared in                        │
│      ▼                                                          │
│  packages/application  (use cases, ports, DTOs, mappers)       │
│      │ depends on                                              │
│      ▼                                                          │
│  packages/domain  (entities, value objects, domain errors)     │
│      (zero runtime dependencies)                               │
└──────────────────────────────────────────────────────────────┘
```

## Layers

### `@lifedeck/domain`

Pure business model. Entities (`Task`), value objects (`Email`,
`TaskStatus`), domain errors, and invariants. No framework imports, no I/O, no
`zod`. Everything here is synchronous and deterministic, which makes it trivial
to test.

### `@lifedeck/application`

Orchestrates the domain to fulfil use cases. A use case is a factory
(`makeCreateTask`) that receives its dependencies as **ports** (interfaces such
as `TaskRepository`, `Clock`, `IdGenerator`) and returns a single async
function. Input is validated with `zod` DTOs; output is mapped to plain view
objects. The application layer never imports Prisma, Next, or Resend.

### `@lifedeck/infrastructure`

Concrete adapters that **implement** the application ports: `PrismaTaskRepository`,
`SystemClock`, `UuidGenerator`, `ResendEmailSender`. This is the only layer that
talks to the database, the clock, the network, or the file system.

### `apps/web`

The delivery mechanism. Next.js App Router renders the UI and exposes the
white-label REST API. The **composition root** (`src/server/container.ts`) is the
single place where concrete adapters are wired into use cases. Route handlers stay
thin: parse the request, call a use case, map errors to HTTP.

### Supporting packages

- `@lifedeck/ui` - framework-level design system (React + Tailwind + Framer Motion).
- `@lifedeck/i18n` - locale detection and message catalogs.
- `@lifedeck/config` - shared tsconfig, ESLint, and Vitest presets.

## Clients (web today, mobile later)

Business logic lives in framework-agnostic packages, not in the web app, so a
future mobile client reuses it without a rewrite. This is a deliberate
positioning decision; the mobile app itself is **not** planned until the web
product is mature (see [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md), Phase 13).

| Layer | Web | Mobile (future) |
| ----- | --- | --------------- |
| `@lifedeck/domain`, `@lifedeck/application` | shared | shared (pure TypeScript, no DOM) |
| `@lifedeck/i18n` | shared | shared |
| REST API `/api/v1` | consumed | consumed (same OpenAPI contract) |
| `@lifedeck/ui` | yes (Tailwind + DOM) | no - a separate `@lifedeck/ui-native` would own React Native UI |

Planned direction for the mobile client is **Expo / React Native** (iOS +
Android), consuming the same API and the shared logic packages. The only
platform-specific work is the UI layer.

## Dependency rule in practice

A use case depends on a `TaskRepository` interface, not on Prisma. Tests inject
`InMemoryTaskRepository`; production injects `PrismaTaskRepository`. Swapping the
database, the email provider, or even the web framework touches only the
infrastructure and composition layers - the domain and application code never
changes.

## Imports & build

Every package builds with **tsup** to `dist/` (ESM + type declarations) and is
consumed through its package name. Internal modules are imported with the `@/`
alias (mapped to each package's `src/`), never with `./` or `../`. tsup resolves
`@/` at build time, so the published `dist/` is fully portable. The Next.js app
consumes the built packages directly (no `transpilePackages`).

## Naming conventions

- Files: `kebab-case.ts`; React components: `kebab-case.tsx` exporting `PascalCase`.
- Imports: `@/...` within a package, `@lifedeck/<pkg>` across packages.
- Types and classes: `PascalCase`. Functions and variables: `camelCase`.
- Use-case factories are named `makeXxx` and return a verb-named function.
- Prisma models are `PascalCase` singular; tables are `snake_case` plural via `@@map`.

## Testing strategy

Every package owns its tests and a 95% coverage gate (see [testing.md](./testing.md)).
Because the domain and application layers have no I/O, they reach full coverage
with fast, deterministic unit tests. Infrastructure adapters that require a live
database are covered by integration tests (planned) and excluded from the unit
coverage gate.
