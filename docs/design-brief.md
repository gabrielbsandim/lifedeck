# Design brief - TaskIn (for Claude Design)

Copy the prompt below into Claude Design. It has access to this repository, so it
can read `@taskin/ui`, `apps/web`, and the docs for context.

---

## Prompt

> You are designing **TaskIn**, a shareable, multilingual to-do web app. The
> codebase already exists in this repo (Next.js 16 App Router, React 19, Tailwind
> CSS v4, a `@taskin/ui` design system, and Framer Motion). Design high-fidelity,
> responsive screens that I can translate 1:1 into Tailwind + `@taskin/ui`
> components. Reuse the existing tokens in `packages/ui/src/styles.css` and extend
> them where needed.
>
> **Product in one line:** plan your day, build standalone lists, share them with a
> link, collaborate, and see simple progress analytics - with no signup required to
> start.
>
> **Brand & mood:** light, calm, modern, friendly. Soft shadows, rounded corners
> (xl/2xl), generous whitespace, an indigo/violet accent in OKLCH, system font
> stack. Subtle, meaningful motion - never flashy. Think "premium productivity app
> that a couple would enjoy using together."
>
> **Audience:** everyday people (the first users are me and my fiancée planning
> wedding tasks). Must feel effortless on a phone first.
>
> **Screens to design (mobile first, then desktop):**
> 1. **Onboarding / first run** - just type a name to start; secondary option to
>    create an account (email + password with email code, or Google).
> 2. **Daily list** - today's tasks with an animated completion progress bar, add
>    task input, check/uncheck with a satisfying micro-animation, per-item
>    observation and assignee avatar, and a per-item "private" toggle.
> 3. **Lists overview** - the daily list plus standalone lists, each with a
>    completion percentage and a shared/owner indicator.
> 4. **List detail** - tasks, reordering, members, and a "Share" action that
>    produces a link ("See my wedding steps on TaskIn").
> 5. **Share / public view** - read-only or collaborate, friendly empty and
>    join states.
> 6. **Analytics** - completion rate with daily / weekly / monthly breakdowns;
>    clean, delightful charts and big legible numbers.
> 7. **Task item states** - empty, loading (skeleton), completed celebration,
>    error.
>
> **Components to define / refine in the design system:** Button (primary, ghost),
> TaskCheckbox (animated), TextField, Avatar, Badge/Pill, ProgressBar, Card,
> ListRow, BottomSheet/Dialog, Tabs, Toast, EmptyState, Skeleton.
>
> **Interactions & motion:** spring-based micro-interactions under ~250ms; a single
> tasteful celebration when a list hits 100%; respect `prefers-reduced-motion`.
>
> **Responsiveness contract (must hold at all breakpoints):** 360 / 640 / 768 /
> 1024 / 1280px. No horizontal scroll at 360px, tap targets >= 44px, body text >=
> 14px, visible focus rings, AA contrast.
>
> **Internationalization:** all copy must be translatable (English and Portuguese
> to start). Avoid baking text into images; keep strings short and key-able.
>
> **Deliverables:** a cohesive screen set + a component sheet with states, spacing,
> radii, and color tokens, exportable so I can map them to Tailwind utilities and
> `@taskin/ui`. Where you introduce a new token, name it so it can live in the
> `@theme` block.

---

## After designing

1. Add any new tokens to `packages/ui/src/styles.css` (`@theme`).
2. Build/adjust the corresponding components in `packages/ui/src/components`.
3. Verify each screen against the responsiveness checklist in
   [design-system.md](./design-system.md).
