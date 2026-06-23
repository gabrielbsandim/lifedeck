# Brand identity brief - Lifedeck (for Claude Design)

Copy the prompt below into Claude Design. It has repository access, so it can read
`packages/ui/src/styles.css` (design tokens), `packages/ui/src/components`, and
`docs/design-system.md` for the existing visual language.

---

## Prompt

> You are creating the **brand identity** for **Lifedeck** - logo, brandmark,
> favicon, app icons and social image. The codebase lives at
> **https://github.com/gabrielbsandim/lifedeck** (connect to it if you can) and
> already has a design system: read `packages/ui/src/styles.css` for the OKLCH
> token palette, `docs/design-system.md` for the principles, and
> `docs/design-brief.md` for the product/screen context. Match that visual
> language exactly - this identity sits on top of the existing UI, it does not
> replace it.
>
> **What Lifedeck is (the idea to express):** not "just a to-do list". Lifedeck is
> about **taking control of your whole life and keeping it organized in the palm of
> your hand** - a personal control panel for your days, lists, routines, goals and
> the people you share them with. The name is **Life + deck**: a *deck* as in a
> dashboard / cockpit / control surface (and, subtly, a deck of cards you arrange
> at a glance). The product spans daily planning, standalone and shared lists,
> recurring tasks, simple analytics, and an AI that turns a brief into a plan - with
> more life-management surfaces (calendar sync, a WhatsApp AI assistant) on the
> roadmap. So the mark should feel like **calm command over your life**, not busy
> task-ticking. It should still feel personal and warm - the first users are a
> couple planning their life together.
>
> **Brand mood:** light, calm, modern, friendly, premium. Soft shadows, rounded
> corners (radii 8/12/16px), generous whitespace, an **indigo/violet** accent.
> Use the existing brand palette in OKLCH:
> - Primary brand: `--color-brand-500: oklch(0.58 0.2 280)` (hex ~`#6d4ae6`),
>   darker `--color-brand-600: oklch(0.52 0.22 280)`, light tint
>   `--color-brand-100: oklch(0.94 0.05 280)`.
> - Accent: `--color-violet-500: oklch(0.6 0.18 300)`.
> - Ink/neutral: `--color-ink-900: oklch(0.21 0.02 265)`; surface white; bg
>   `oklch(0.985 0.004 265)`.
> - System font stack (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI',
>   Roboto, sans-serif`). If the wordmark needs a typeface, pick a clean modern
>   geometric/humanist sans that pairs naturally with the system stack.
>
> **Deliverables (please produce all):**
> 1. **2-3 concept directions** for the brandmark first (quick), each a one-line
>    rationale tied to the "deck / control panel / life in your hand" idea. Then
>    **pick one** and finalize the full system from it.
> 2. **Brandmark (icon)** - the abstract symbol alone. Must be simple enough to
>    read at **16px** (favicon) and look great as a large app icon. Provide a
>    full-color version and a single-color (monochrome) version that works on light
>    and dark backgrounds. Geometric, few elements, no fine detail that collapses
>    when small.
> 3. **Wordmark** - "Lifedeck" as a logotype (one word, capital L). Define letter
>    spacing and the exact color.
> 4. **Lockups** - horizontal (icon + wordmark) and stacked (icon over wordmark),
>    with defined clear-space and minimum sizes.
> 5. **Favicon** - an SVG optimized for 16/32px (likely the brandmark simplified).
> 6. **App icons** - a maskable PWA icon (safe-zone aware, for 192 and 512px) and
>    an Apple touch icon (180px, no transparency, rounded by the OS).
> 7. **Social / OpenGraph image** - 1200x630, logo + a short tagline, on a calm
>    branded background. Keep text minimal and translatable (don't bake long copy
>    in).
> 8. **One-page brand sheet** - color usage, clear space, min sizes, do/don'ts, and
>    the light/dark and mono variants side by side.
>
> **Technical output (so I can drop it straight into the repo):**
> - Prefer **SVG source** for every mark; keep paths clean, use `currentColor`
>   where a mono variant is needed, and keep viewBoxes tidy.
> - Map the assets to these existing files so I can replace them 1:1:
>   `apps/web/src/app/icon.svg` (favicon/app icon), `apps/web/src/app/apple-icon.tsx`
>   and `apps/web/src/app/opengraph-image.tsx` (both rendered with `next/og`
>   `ImageResponse`, so give me the JSX/markup or exact specs to rebuild them), and
>   `apps/web/src/app/manifest.ts` (`theme_color` is `#6d4ae6` - tell me if it
>   should change).
> - Also design a reusable **`<Logo />` / `<Wordmark />` React component** for
>   `packages/ui/src/components` (inline SVG, accepts `className`, sizes via
>   tokens), so the app header and marketing pages share one source of truth.
> - Reuse existing `@theme` tokens; if you introduce a new color or radius, name it
>   so it can live in Tailwind's `@theme` block in `styles.css`.
>
> **Constraints:** OKLCH colors; AA contrast; the brandmark must stay legible in a
> single color and at 16px; respect the calm, uncluttered tone (no gradients-heavy,
> no flashy 3D); everything must feel of-a-piece with the current `@lifedeck/ui`
> screens.

---

## After Claude Design delivers

Bring the generated files/specs back here and I will:

1. Replace `apps/web/src/app/icon.svg`, rebuild `apple-icon.tsx` and
   `opengraph-image.tsx` from the new marks, and update `manifest.ts`
   (`theme_color` + icon entries) if the color shifts.
2. Add the `<Logo />` / `<Wordmark />` component(s) to `packages/ui/src/components`
   and wire them into the app header / onboarding / marketing surfaces.
3. Register any new tokens in `packages/ui/src/styles.css` (`@theme`).
4. Verify every surface against the responsiveness + a11y checklist in
   `docs/design-system.md`, then run `pnpm check`.
