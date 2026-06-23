# Design reference

High-fidelity source of truth produced in Claude Design from
[docs/design-brief.md](../docs/design-brief.md). These files are the visual
reference; the implementation lives in `@lifedeck/ui` and `apps/web`.

- `lifedeck-foundation.dc.html` - Stage 1: token sheet, component sheet (all
  states), and the interactive Daily list (mobile + desktop).
- `lifedeck-screens.dc.html` - Stage 2: onboarding, lists overview, list detail,
  share/public view, analytics, and task-item states. EN/PT switch throughout.
- `lifedeck-brand.dc.html` - brand identity sheet: the "Deck" mark concepts,
  construction grid, legibility ladder, colour, wordmark, lockups, favicon,
  maskable + Apple icons, OpenGraph, and light/dark/mono usage. The brief that
  produced it is in [brand-identity-prompt.md](./brand-identity-prompt.md); the
  implementation lives in `@lifedeck/ui` (`<Logo/>`) and `apps/web`.
- `support.js` - shared Claude Design runtime the `.dc.html` files load; required
  for them to render. Generated, not hand-edited.

Open them in a browser to compare pixel-for-pixel. The tokens here are mirrored
into Tailwind's `@theme` in `packages/ui/src/styles.css`; keep the two in sync.
