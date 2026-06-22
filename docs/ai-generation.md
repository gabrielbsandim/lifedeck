# AI list generation

A premium-friendly feature: the user answers a few guided questions plus a free
text description, and Claude returns a complete, editable checklist. This page
records the contract and the architectural decisions.

Status: implemented (Phase 6.5). The port, `generateList` use case, `ClaudeListGenerator`
adapter, `POST /api/v1/lists/generate` endpoint, and the `/generate` UI all ship.
Two items from the original design are deferred: token-by-token streaming of the
draft (folded into the Phase 7 motion pass) and rate limiting / per-plan quotas
(waiting on the billing model).

The provider is chosen at the composition root, never named in the use case. A single
`AiSdkListGenerator` implements the port over the Vercel AI SDK; the container's
`buildListGenerator()` reads the `AI_MODEL` string and instantiates it, falling back to
a `StubListGenerator` when `AI_MODEL` is unset so local dev and CI work offline
(mirroring the console email sender).

### Selecting a provider (env)

| Var | Meaning |
| --- | --- |
| `AI_MODEL` | Gateway model string, `creator/model`. Unset = stub (offline). Examples: `anthropic/claude-opus-4-8`, `google/gemini-2.5-flash`, `openai/gpt-5.4`. |
| `AI_GATEWAY_API_KEY` | AI Gateway auth. Needed locally; on Vercel it is provided automatically via OIDC. |

Switching providers or models is purely an `AI_MODEL` change. The AI Gateway routes the
request, so there is no per-provider SDK or key to manage, and it adds observability and
model fallback. Cost note: `google/gemini-2.5-flash` is the cheapest serious option and
the high-volume default when the monetization hook lands; `anthropic/claude-opus-4-8`
gives the best quality while tuning prompts.

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
- **Runtime (chosen):** the Vercel AI SDK (`ai`) via `generateObject({ model, schema,
  system, prompt })`, with `model` as an AI Gateway string (`creator/model`). The schema
  passed is `generatedPlanSchema` itself, so the contract is a single Zod source of truth
  for the model's structured output and the app types. `generateList` re-validates the
  result with the same schema (defense in depth), so invalid output never reaches the
  draft regardless of provider.
- **Prompt caching:** the system prompt is static and is sent as a cached system
  text block (`cache_control: { type: 'ephemeral' }`); only the brief varies per
  request.
- **v1 surface:** the adapter requests `listTitle` + flat `tasks` (title + optional
  note). The `GeneratedPlan` contract keeps `sections` and `suggestedAssignee`
  optional for forward compatibility; `generateList` flattens any sections into the
  ordered task list and clamps to 60 tasks.

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
