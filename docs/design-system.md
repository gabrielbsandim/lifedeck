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

## Interaction patterns

- **Task reordering** uses drag-and-drop via `@dnd-kit` (`TaskDragList` +
  `DailyTaskRow`). Each row exposes a six-dot grip handle (`cursor-grab`,
  `touch-none`); only the handle starts a drag, so taps still reach the
  checkbox and inline controls. Dragging is keyboard-accessible (focus the
  handle, `Space` to lift, arrows to move, `Space` to drop) and persists the
  full task order through the reorder mutation.
- **Secondary row actions** (add note, privacy toggle) stay calm: hidden until
  row hover/focus on pointer screens, always visible on touch where there is no
  hover.
- **Navigation.** Desktop uses the left `AppSidebar` (with the account pinned at
  the bottom). Below `lg`, a fixed `MobileTabBar` gives a native, app-like bottom
  bar (Today / Lists / Assistant / Habits / Profile). The Profile tab opens the
  settings hub, which also holds Calendar, Analytics, Recurring tasks and
  Developers; those pages light up Profile (`activeMobileTab` in
  `lib/navigation/active-tab.ts`).
- **Sign-in round trip.** `RequireAuth` sends a signed-out visitor to
  `/?returnTo=<path>`, and the home screen returns there once a session exists.
  Only same-origin paths pass (`safeReturnTo`), so the parameter cannot become an
  open redirect.

## Errors

- **Failed saves** surface in one place: the `QueryClient` built by
  `createAppQueryClient` (`lib/api/mutation-feedback.ts`) reports every failed
  mutation to a toast rendered by `Providers` (`MutationToast`, bottom of the
  screen above the tab bar, `role="alert"`, auto-dismiss after 6 s). The message
  says why in plain words: offline, session ended (401), too many requests (429),
  or a generic "couldn't save".
- A screen that already shows the error next to its own form marks the hook with
  `meta: INLINE_ERROR` so the toast stays quiet (sign-in, checkout, calendar
  connect, find time, the assistant chat). Add it only when the inline message
  exists.
- **Crashes and unknown routes** use the branded `StatusPage`: `app/error.tsx`
  (retry plus home, reported to Sentry), `app/global-error.tsx` (when the root
  layout itself fails, locale from the browser) and `app/not-found.tsx` (404).
- **Loading is not empty.** A screen shows a skeleton while its query is pending
  and an error with retry when it fails; the empty state is only for a real empty
  result. A paid screen a free user can reach shows an upgrade card, never a
  blank page (Calendar).

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
