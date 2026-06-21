# Testing

TaskIn enforces a **95% coverage gate from day one**, applied per package.

## Tooling

- **Runner:** Vitest.
- **Coverage:** v8 provider, thresholds defined in `@taskin/config/vitest/base`.
- **DOM:** `jsdom` + Testing Library for `@taskin/ui` and `apps/web`.

The shared `createVitestConfig` factory sets a 95% threshold for lines,
functions, branches, and statements. Each package extends it and can adjust the
coverage include/exclude globs.

## Conventions

- Tests are colocated next to the code: `task.ts` -> `task.test.ts`.
- Name the suite after the unit under test; describe behavior, not implementation.
- Prefer real collaborators from the same layer; replace I/O ports with fakes
  (`InMemoryTaskRepository`, `FixedClock`, `SequentialIdGenerator`).

## What is excluded from coverage

Coverage measures logic, not wiring. The following are intentionally excluded:

- Barrel files (`index.ts`) and pure type files.
- Static data (translation catalogs).
- I/O adapters that require a live database or network (`PrismaTaskRepository`,
  `ResendEmailSender`, `prisma-client`) - these are covered by integration tests.
- The composition root (`container.ts`) and the OpenAPI document.

## Layer-by-layer

| Layer          | Style                         | Notes                                  |
| -------------- | ----------------------------- | -------------------------------------- |
| domain         | Pure unit                     | No mocks needed.                       |
| application    | Unit with in-memory ports     | Fakes injected through the factory.    |
| infrastructure | Unit (mappers) + integration  | Mappers unit-tested; DB adapters later.|
| ui             | Component (Testing Library)   | Behavior and accessibility roles.      |
| web            | Unit (server helpers)         | Route logic lives in `src/server`.     |

## Running

```bash
pnpm test                 # all packages, no coverage
pnpm test:coverage        # all packages with the 95% gate
pnpm --filter @taskin/domain test:coverage   # a single package
```

## Responsiveness checks

Every screen change must be validated at the breakpoints listed in
[design-system.md](./design-system.md). The PR template includes a responsiveness
checklist that must be ticked for any UI change.
