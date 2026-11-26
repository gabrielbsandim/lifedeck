# In-app assistant chat

Status: implemented (web). The same tool-calling assistant that runs over
WhatsApp, surfaced inside the app as a WhatsApp-style chat. It reuses the agent,
its tools, the conversation history, and credit metering unchanged; it only drops
the parts that are specific to the WhatsApp transport (phone pairing, outbound
send, the 24h session window). Because history is keyed by `userId`, the in-app
chat and WhatsApp share one memory: a task added in the app is remembered in a
later WhatsApp turn, and vice versa. Gated by the same `whatsappAssistant`
entitlement. The app UI (React Native) is a later slice; this page covers the web
slice and the shared backend.

## Where it lives

- Use case: `packages/application/src/use-cases/handle-in-app-message.ts`
  (`makeHandleInAppMessage`).
- Route: `apps/web/src/app/api/v1/assistant/chat/route.ts` (`POST` a turn, `GET`
  the thread, `DELETE` to start over).
- History use cases: `packages/application/src/use-cases/assistant-history.ts`
  (`makeGetAssistantHistory`, `makeClearAssistantHistory`).
- Client hooks: `apps/web/src/lib/api/use-assistant.ts` (`useSendAssistantMessage`,
  `useAssistantHistory`, `useClearAssistantHistory`).
- Screen: `apps/web/src/components/assistant-chat.tsx` (`AssistantChat`), mounted
  at the `/generate` route (`apps/web/src/app/generate/page.tsx`). The nav tab is
  labelled from `nav.generate` ("Assistant" / "Assistente" / "Asistente"); it
  replaced the standalone AI list generator, whose list-building capability now
  lives inside the assistant as the `createList` tool.

## Backend orchestration

`handleInAppMessage` is a variant of the WhatsApp `assist()` flow. It takes an
authenticated `{ userId, kind, ... , locale? }` and returns a status the route
maps to HTTP, never sending anything itself:

1. **Entitlement:** `EntitlementService.for(userId)` must grant `whatsappAssistant`
   (otherwise `denied`).
2. **Media guard:** a voice/image turn is refused before metering when the
   `Transcriber` / `VisionReader` is not configured (`unconfigured`), so an
   unusable deployment never charges a credit.
3. **Meter:** first takes the per-user `TurnLock` (shared with WhatsApp; a turn
   that cannot get it → `busy`, nothing charged), then `consumeCredits` debits
   before the model call, metered by modality
   and model tier (`assistantText` / `audioTranscription` / `imageVision` /
   `assistantPro`); `QuotaExceededError` → `quota`. A metering-backend failure →
   `error`, nothing charged.
4. **Agent:** loads history from the `ConversationStore` (by `userId`), runs
   `AgentRunner.run(...)`, and on any model failure **refunds** the credit. A
   provider rate limit → `busy`; other failures → `error`.
5. **Reply and persist:** appends the `[user, assistant]` turn to history, the
   assistant turn carrying what its tools changed (`actions: RecordedAction[]`)
   (best-effort — a store failure still returns the reply) and returns
   `{ status: 'reply', text, actions }`. A wordless tool run falls back to a
   localized acknowledgement (`Done.` / `Feito.` / `Hecho.`) so an action is
   always confirmed and history never holds an empty assistant turn.

Voice notes are understood directly (multimodally) with a transcription fallback,
exactly as on WhatsApp.

### Action cards

`AgentReply.actions` (`packages/application/src/ports/agent-runner.ts`) carries a
receipt for each card-worthy tool the assistant ran this turn, so the chat can
render an inline card instead of only the assistant's sentence. Each
`AgentAction` is `{ tool, input, result }`: `input` holds the arguments the model
passed (a task title, an event time) and `result` the tool's return value (the
day's tasks, a weather lookup) — needed because a mutation's result is only an
id. `AiSdkAgentRunner` collects these from the multi-step generation, keeping only
`addTask`, `addEvent`, `addHabit`, `createList`, `getToday`, `getWeather`,
`findTime`, and `logActivity` (lookups and plain deletes are dropped; the sentence
covers those). The
WhatsApp channel ignores `actions`; only the in-app chat renders them.

## Route and transport

`POST /api/v1/assistant/chat` (session-auth, rate-limited by
`checkAssistantRateLimit`, 15 per 60s):

- **Text** comes as JSON `{ text, locale? }`.
- **Media** comes as `multipart/form-data` with an `image` or `audio` file (plus
  optional `text`/`locale`). Precedence is image, then audio, then the text
  field. Uploads over 12MB are refused (422). The bytes become a `MediaPayload`
  handed to the same use case.

`GET /api/v1/assistant/chat` returns the stored thread as `[{ role, text }]`,
blank turns dropped and recorded actions left out (their cards were shown on the
turn that made them). It is the same history the agent reads, so WhatsApp turns
and delivered check-ins appear too. `DELETE` clears it, which also resets the
WhatsApp memory, since both channels share one history.

The client (`apiRequest`) lets a `FormData` body own its multipart content-type;
text requests stay JSON. Statuses map to `reply` → 200, `denied` → 403 (code
`ASSISTANT_LOCKED`), `quota`/`busy` → 429, `unconfigured` → 422, `error` → 500.

## Web UI

`AssistantChat` is a WhatsApp-style thread: an online header with a "new chat"
reset (it calls `DELETE`, so a reload does not bring the old thread back), user/assistant bubbles, a typing indicator, and the inline action cards
(task added, event scheduled, habit created, list created, "your day", weather, a
free slot). An empty thread shows suggestion chips that are concrete example
requests ("Buy milk tomorrow", "How does my day look?") — tapping one sends it, so
the chips teach what the assistant can do. A failed turn shows an inline error
with retry; a `denied`/`quota` response shows the Pro upsell. On success the hook
invalidates only the screens the taken actions touched (Today, Lists, Habits,
Calendar).

On mount the screen seeds the thread once from a fresh `GET`, so a reload keeps
the conversation; a photo turn shows the stored description of the photo, since
history keeps text only. The thread is a `role="log"` region, so screen readers
announce replies as they arrive. The send hook is marked `INLINE_ERROR` (see
[design system](./design-system.md#errors)): the thread shows its own error.

The input bar supports all three modalities: a text field (mic button when empty,
send button once typing), an attach-image button (a file input), and a mic that
records via `MediaRecorder`/`getUserMedia` with a recording state (timer, cancel,
send). Outbound photos and voice notes render as their own bubbles.

## Copy

All chat copy lives under the `assistant` key in the i18n messages
(`packages/i18n/src/messages/{en,pt,es}.ts`): header/status, chips, card labels,
error, upsell, and the media controls (`recording`, `cancel`, `sendAudio`,
`voiceMessage`, `photo`, `micUnavailable`).

## Env vars

None beyond the WhatsApp assistant's: `GEMINI_API_KEY` (and `GEMINI_MODEL_ID` /
`GEMINI_PRO_MODEL_ID`) power the agent and multimodal understanding;
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` back the shared conversation
history and the rate limiter. See [WhatsApp assistant](./whatsapp.md) for the full
agent, tools, and multimodal details this feature reuses.

## Model evals

`packages/infrastructure/evals/assistant` runs the production agent runner
against real models over an in-memory Life Deck, one fresh user per case. Each
scenario seeds tasks or habits, sends one message and checks the resulting
state (habit logged, task completed, nothing duplicated), so a model is judged
by what it changed, not by its wording. The scenarios come from the bot's known
comprehension failures: creating instead of reconciling, a habit logged as a
task, a correction that duplicates.

It calls paid APIs, so it never runs in `pnpm test` or CI:

```sh
NODE_USE_ENV_PROXY=1 OPENAI_API_KEY=... GEMINI_API_KEY=... \
EVAL_MODELS=gemini-2.5-flash,gpt-6-luna EVAL_RUNS=3 \
pnpm --filter @lifedeck/infrastructure eval:assistant
```

`EVAL_ONLY` takes scenario ids and `EVAL_OUT` writes every case as JSON. The
summary shows the pass rate, unbacked "I did it" claims, p50 latency, tokens per
turn and an estimated cost per thousand turns from the price table in
`run.eval.ts`.
