# Design brief - Lifedeck (for Claude Design)

Copy the prompt below into Claude Design. It has access to this repository, so it
can read `@lifedeck/ui`, `apps/web`, and the docs for context.

---

## Prompt

> You are designing **Lifedeck**, a shareable, multilingual to-do web app. The
> codebase lives at **https://github.com/gabrielbsandim/lifedeck** (connect to it if
> you can), so read `packages/ui/src/styles.css`
> (design tokens), `packages/ui/src/components` (existing components), and
> `docs/design-system.md` before starting. Stack: Next.js 16 App Router, React 19,
> Tailwind CSS v4, Framer Motion. Design high-fidelity, responsive screens I can
> translate 1:1 into Tailwind + the `@lifedeck/ui` design system. Reuse the existing
> tokens and extend them where needed; when you add a token, name it so it can live
> in Tailwind's `@theme` block.
>
> **Product in one line:** plan your day, build standalone lists, share them with a
> link, collaborate, and see simple progress analytics - with no signup required to
> start.
>
> **Brand & mood:** light, calm, modern, friendly. Soft shadows, rounded corners
> (xl/2xl), generous whitespace, an indigo/violet accent in OKLCH, system font
> stack. Subtle, meaningful motion - never flashy. Think "premium productivity app
> that a couple would enjoy using together." Audience: everyday people (the first
> users are me and my fiancée planning wedding tasks). It must feel effortless on a
> phone first.
>
> **Work in two stages - do Stage 1 first, then continue to Stage 2 in the same
> flow:**
>
> **Stage 1 - Foundation (deliver this first):**
> - A **component sheet** with all states (default / hover / focus / disabled /
>   loading / error): Button (primary, ghost), TaskCheckbox (animated check),
>   TextField, Avatar, Badge/Pill, ProgressBar, Card, ListRow, BottomSheet/Dialog,
>   Tabs, Toast, EmptyState, Skeleton.
> - The **Daily list** screen, mobile first then desktop: today's tasks with an
>   animated completion progress bar, add-task input, check/uncheck with a
>   satisfying micro-animation, per-item observation and assignee avatar, and a
>   per-item "private" toggle.
> - A **token sheet**: colors (OKLCH), spacing, radii, typography scale, shadows,
>   motion durations/easings.
>
> **Stage 2 - Remaining screens (mobile first, then desktop), built on the Stage 1
> tokens and components:**
> 1. **Onboarding / first run** - just type a name to start; secondary option to
>    create an account (email + password with email code, or Google).
> 2. **Lists overview** - the daily list plus standalone lists, each with a
>    completion percentage and a shared/owner indicator.
> 3. **List detail** - tasks, reordering, members, and a "Share" action that
>    produces a link ("See my wedding steps on Lifedeck").
> 4. **Share / public view** - read-only or collaborate, with friendly empty and
>    join states.
> 5. **Analytics** - completion rate with daily / weekly / monthly breakdowns;
>    clean, delightful charts and big legible numbers.
> 6. **Task item states** - empty, loading (skeleton), completed celebration,
>    error.
>
> **Interactions & motion:** spring-based micro-interactions under ~250ms; a single
> tasteful celebration when a list hits 100%; respect `prefers-reduced-motion`.
>
> **Responsiveness contract (must hold at every breakpoint):** 360 / 640 / 768 /
> 1024 / 1280px. No horizontal scroll at 360px, tap targets >= 44px, body text >=
> 14px, visible focus rings, AA contrast minimum.
>
> **Internationalization:** all copy must be translatable (English and Portuguese
> to start). Don't bake text into images; keep strings short and key-able.
>
> **Deliverables:** the screens above plus the component and token sheets,
> exportable so I can map them to Tailwind utilities and `@lifedeck/ui`. Keep
> everything consistent with the existing tokens in `packages/ui/src/styles.css`.

---

## After designing

1. Add any new tokens to `packages/ui/src/styles.css` (`@theme`).
2. Build/adjust the corresponding components in `packages/ui/src/components`.
3. Verify each screen against the responsiveness checklist in
   [design-system.md](./design-system.md).
