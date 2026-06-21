# Design reference

High-fidelity source of truth produced in Claude Design from
[docs/design-brief.md](../docs/design-brief.md). These files are the visual
reference; the implementation lives in `@taskin/ui` and `apps/web`.

- `taskin-foundation.dc.html` - Stage 1: token sheet, component sheet (all
  states), and the interactive Daily list (mobile + desktop).
- `taskin-screens.dc.html` - Stage 2: onboarding, lists overview, list detail,
  share/public view, analytics, and task-item states. EN/PT switch throughout.

Open them in a browser to compare pixel-for-pixel. The tokens here are mirrored
into Tailwind's `@theme` in `packages/ui/src/styles.css`; keep the two in sync.
