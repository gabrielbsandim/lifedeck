# Design system

The design system lives in `@lifedeck/ui` and is consumed by `apps/web`. It aims
for a light, calm, modern feel with smooth, subtle motion - never flashy.

## Principles

- **Calm by default.** Generous whitespace, soft shadows, rounded corners.
- **Motion with meaning.** Animations confirm actions (completing a task, closing
  a list) and respect `prefers-reduced-motion`.
- **Accessible.** Semantic roles, visible focus rings, AA contrast minimum.
- **Responsive from the first pixel.** Mobile layout is the baseline; larger
  breakpoints enhance it.

## Tokens

Defined as Tailwind v4 `@theme` variables in `packages/ui/src/styles.css`
(brand palette in OKLCH, system font stack). Components consume tokens through
Tailwind utility classes; the `cn` helper merges and de-duplicates classes.

## Motion

`framer-motion` powers transitions. Guidelines:

- Spring transitions for interactive feedback (checkbox, progress bar).
- Durations under ~250ms for micro-interactions.
- Celebrate milestones (all tasks done) with a single, tasteful flourish.

## Breakpoints (responsiveness contract)

Every new or changed screen must be verified at these widths:

| Name | Width  | Notes                          |
| ---- | ------ | ------------------------------ |
| xs   | 360px  | Small phones - baseline.       |
| sm   | 640px  | Large phones.                  |
| md   | 768px  | Tablets.                       |
| lg   | 1024px | Small laptops.                 |
| xl   | 1280px | Desktops.                      |

Checklist for any UI change:

- [ ] No horizontal scroll at 360px.
- [ ] Tap targets >= 44x44px.
- [ ] Text remains legible (no clamping below 14px body).
- [ ] Layout reflows (no fixed widths that overflow).
- [ ] Focus order and visible focus preserved.
- [ ] `prefers-reduced-motion` disables non-essential animation.

## External design workflow

High-fidelity screens are designed in Claude Design from the brief in
[design-brief.md](./design-brief.md), then translated into `@lifedeck/ui`
components and Tailwind tokens. The brief is the source of truth for visual
direction; this document is the source of truth for implementation rules.
