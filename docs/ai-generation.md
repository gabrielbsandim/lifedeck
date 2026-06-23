# AI list generation

A premium-friendly feature: the user answers a few guided questions plus a free
text description, and a language model returns a complete, editable checklist.
This page records the contract and the architectural decisions.

Status: implemented (Phase 6.5). The port, `generateList` use case, `AiSdkListGenerator`
adapter, `POST /api/v1/lists/generate` endpoint, and the `/generate` UI all ship.
Two items from the original design are deferred: token-by-token streaming of the
draft (folded into the Phase 7 motion pass) and rate limiting / per-plan quotas
(waiting on the billing model).

The provider is chosen at the composition root, never named in the use case.
`AiSdkListGenerator` implements the port over the Vercel AI SDK's `generateObject`,
accepting either a Gateway model string or a concrete provider model instance.
`buildListGenerator()` resolves the provider in this order and falls back to a
`StubListGenerator` so local dev and CI work offline (mirroring the console email
sender):

1. `GEMINI_API_KEY` set → direct Google Gemini (`createGoogleListGenerator`), which
   talks to the Gemini API with your own key and does **not** consume Vercel AI
   Gateway credits. This mirrors how Obra Nova consumes Gemini.
2. else `AI_MODEL` set → Vercel AI Gateway (string model, OIDC auth on Vercel).
3. else → offline stub.

### Selecting a provider (env)

| Var | Meaning |
| --- | --- |
| `GEMINI_API_KEY` | Direct Google Gemini key (Google AI Studio). When set, used first; bypasses the AI Gateway and its credits. |
| `GEMINI_MODEL_ID` | Gemini model id. Default `gemini-2.5-flash`. |
| `AI_MODEL` | Gateway model string, `creator/model`. Used only when `GEMINI_API_KEY` is unset. Examples: `anthropic/claude-opus-4-8`, `google/gemini-2.5-flash`. |
| `AI_GATEWAY_API_KEY` | AI Gateway auth. Needed locally for the gateway path; on Vercel it is provided automatically via OIDC. |

Prefer `GEMINI_API_KEY` when you already have Gemini quota/credits — the AI Gateway's
free credits are limited and, once exhausted, every gateway generation fails with a
"credits" error. The Gateway path remains available for multi-provider routing and
observability when credits are funded.

## Why it fits clean architecture

The LLM is an external, "dirty" dependency, so it lives behind a **port** in the
application layer and an **adapter** in infrastructure - the exact pattern used
for `TaskRepository`. The domain and application layers never import an AI SDK.

```
application/ports/list-generator.ts          interface ListGenerator
application/use-cases/generate-list.ts        orchestrates: validate → generate → validate → persist
infrastructure/ai/ai-sdk-list-generator.ts    implements ListGenerator (Vercel AI SDK, structured output)
```

Tests inject a deterministic `FakeListGenerator`; production injects the AI SDK
adapter (or `StubListGenerator` when `AI_MODEL` is unset). Swapping the AI provider
or model touches only the adapter - in practice, just the `AI_MODEL` env.

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
  locale: z.enum(['en', 'pt', 'es']).default('en'),
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
      │  2. ListGenerator.generate(brief)  ──>  AI Gateway model (structured output)
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

- **Model selection:** chosen via the `AI_MODEL` env (`creator/model`), so it is a
  deliberate operational decision rather than a hardcoded default. `google/gemini-2.5-flash`
  is the cheap, high-volume default; `anthropic/claude-opus-4-8` trades cost for quality.
  Unset `AI_MODEL` falls back to the offline `StubListGenerator`.
- **Runtime (chosen):** the Vercel AI SDK (`ai`) via `generateObject({ model, schema,
  system, prompt })`, with `model` as an AI Gateway string (`creator/model`). The schema
  passed is `generatedPlanSchema` itself, so the contract is a single Zod source of truth
  for the model's structured output and the app types. `generateList` re-validates the
  result with the same schema (defense in depth), so invalid output never reaches the
  draft regardless of provider.
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
