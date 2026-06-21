# AI list generation

A premium-friendly feature: the user answers a few guided questions plus a free
text description, and Claude returns a complete, editable checklist. This page
records the contract and the architectural decisions. It is design-only; nothing
here is implemented yet (see [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md), Phase 6.5).

## Why it fits clean architecture

The LLM is an external, "dirty" dependency, so it lives behind a **port** in the
application layer and an **adapter** in infrastructure - the exact pattern used
for `TaskRepository`. The domain and application layers never import an AI SDK.

```
application/ports/list-generator.ts        interface ListGenerator
application/use-cases/generate-list.ts      orchestrates: validate → generate → validate → persist
infrastructure/ai/claude-list-generator.ts  implements ListGenerator (Claude, structured output)
```

Tests inject a deterministic `FakeListGenerator`; production injects Claude.
Swapping the AI provider touches only the adapter.

## Contract (single source of truth: Zod)

The same Zod schemas validate the API request, the model's structured output, and
the frontend types.

### Input - `GenerationBrief`

```ts
const generationBriefSchema = z.object({
  category: z.enum(['wedding', 'trip', 'moving', 'event', 'project', 'other']),
  title: z.string().trim().max(120).optional(),
  targetDate: z.string().date().optional(),
  scale: z.enum(['small', 'medium', 'large']),
  peopleInvolved: z.array(z.string().trim().max(80)).max(20).optional(),
  description: z.string().trim().min(1).max(2000),
  locale: z.enum(['en', 'pt']).default('en'),
})
```

### Output - `GeneratedPlan`

```ts
const generatedTaskSchema = z.object({
  title: z.string().trim().min(1).max(280),
  note: z.string().trim().max(2000).optional(),
  suggestedAssignee: z.string().trim().max(80).optional(),
})

const generatedPlanSchema = z.object({
  listTitle: z.string().trim().min(1).max(120),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(120),
        tasks: z.array(generatedTaskSchema).max(40),
      }),
    )
    .max(12)
    .optional(),
  tasks: z.array(generatedTaskSchema).max(80),
})
```

Even if the model overshoots, the domain entities clamp again on persistence
(`Task.create` enforces the title limit), so invalid output cannot reach the DB.

## Flow

```
POST /api/v1/lists/generate   (versioned, documented in OpenAPI)
      │  body: GenerationBrief
      ▼
generateList use case
      │  1. parse GenerationBrief (Zod)
      │  2. ListGenerator.generate(brief)  ──>  Claude (structured output)
      │  3. parse GeneratedPlan (Zod)
      │  4. map to a draft List + Task[]
      ▼
returns a DRAFT (not persisted) for the user to edit, then a second call saves it
```

UX notes:

- **Never auto-save.** Return an editable draft; the user confirms before it is
  written. This keeps the human in control and avoids junk lists.
- **Stream the items** as they generate for a delightful "building it for you" feel
  (pairs with the completion animations in the design system).

## Model and runtime

- **Default model:** `claude-opus-4-8` while tuning the prompt for quality.
- **Cost lever:** this is a relatively simple, high-volume generation task, so
  `claude-sonnet-4-6` is likely indistinguishable in quality at a fraction of the
  output cost. Calibrate on Opus, then A/B against Sonnet and pick per the
  cost/quality result. Model choice is a deliberate decision, not a silent default.
- **Runtime options:** the AI SDK through the Vercel AI Gateway (native to our
  Vercel deploy, with observability and model fallback) or the official Anthropic
  SDK directly. Both support structured output validated by the Zod schema above.
- **Prompt caching:** the system prompt is static, so cache it; only the brief
  varies per request.

## Security

- **User input is untrusted data, never instructions.** The `description` is
  passed as content; the system prompt is fixed and separate. This prevents
  prompt-injection attempts ("ignore your rules and...").
- **Clamp the output:** caps on task and section counts (schema), and the domain
  re-validates on persistence.
- **Rate limit + quotas:** guests get a small number of free generations,
  registered users more, paid plans more still. This is also the natural
  monetization hook (see the business model notes).
- **Abuse / cost control:** per-user and per-IP rate limits on the generate
  endpoint; reject oversized briefs at the edge.

## Testing

- Unit-test `generateList` with a `FakeListGenerator` returning fixed plans
  (happy path, oversized output that gets clamped, invalid output that rejects).
- The Claude adapter is covered by integration tests (excluded from the unit
  coverage gate), like the Prisma and Resend adapters.
