# Contributing

Thanks for your interest in Lifedeck. This guide keeps the codebase consistent.

## Principles

- **Clean architecture.** Respect the dependency direction (see
  [docs/architecture.md](./docs/architecture.md)). Domain never imports a
  framework; use cases depend on ports, not concrete adapters.
- **No inline comments.** Code should read clearly through naming and small
  functions. Document intent in `docs/`, not in code comments.
- **English everywhere.** Code, comments-in-docs, commits, and identifiers.
- **Tests first-class.** New logic ships with tests; coverage stays >= 95%.

## Workflow

1. Branch from `main`: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
2. Make the change with tests.
3. Run `pnpm check` (lint + typecheck + format + coverage). It must pass.
4. For UI changes, complete the responsiveness checklist in the PR template.
5. Open a pull request describing the what and the why.

## Commit messages

Conventional Commits, short and imperative:

```
feat: add list sharing endpoint
fix: prevent duplicate task completion timestamp
docs: document i18n detection flow
```

Keep the subject as the whole message - no body required for small changes.

## Code style

- Prettier and ESLint are authoritative; do not hand-format around them.
- Imports use the `@/` alias for in-package modules (e.g. `@/shared/guard`) and
  the package name for cross-package imports (e.g. `@lifedeck/domain`). Do not use
  `./` or `../` relative paths.
- `kebab-case` filenames; `PascalCase` types/components; `camelCase` values.
- Prefer pure functions and explicit dependencies (constructor/parameter
  injection) over hidden singletons.

## Definition of done

- [ ] Tests added/updated and `pnpm check` is green.
- [ ] Public behavior reflected in `docs/` and, for API changes, in the OpenAPI doc.
- [ ] No new inline code comments.
- [ ] Responsiveness checklist complete (UI changes).
