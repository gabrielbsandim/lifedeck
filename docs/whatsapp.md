# WhatsApp AI assistant

Status: implemented (V2-7 and V2-8). Conceptually an agent with tool-calling that
runs over the existing application use cases as the linked user, so business logic
is never rewritten. The feature is flag-gated behind `FEATURE_WHATSAPP` (and the
master `FEATURES_V2`) and only acts for users with the `whatsappAssistant`
entitlement. This page records the transport, the webhook, identity pairing, the
inbound orchestration, multimodal handling, and the env vars.

## Transport

WhatsApp is reached through the `MessagingChannel` port
(`packages/application/src/ports/messaging-channel.ts`: `sendText`, `sendTemplate`,
`fetchMedia`). `createMessagingChannel`
(`packages/infrastructure/src/messaging/whatsapp-cloud-channel.ts`) selects an
adapter by precedence:

1. **Abracode gateway** (`AbracodeChannel`) when `ABRACODE_API_KEY` and
   `ABRACODE_FROM` are set. Abracode manages the Meta token, so only an API key is
   needed. It calls `POST /api/v1/messages` and `GET /api/v1/media/{id}` at
   `ABRACODE_BASE_URL` (default `https://api.abracode.com.br`);
   `ABRACODE_PHONE_NUMBER_ID` (the Meta `phone_number_id`) is only needed to
   resolve inbound media.
2. **Meta Cloud API direct** (`WhatsAppCloudChannel`) when `WHATSAPP_PHONE_NUMBER_ID`
   and `WHATSAPP_ACCESS_TOKEN` are set. Talks to Meta Graph `v21.0`.
3. **No-op** otherwise (dev/preview): sends are dropped.

Inbound over Abracode uses a separate webhook (see below); everything downstream
of parsing is identical regardless of transport.

## Webhook

`apps/web/src/app/api/v1/webhooks/whatsapp/route.ts`:

- **GET** verifies the `hub.challenge` handshake (matching `WHATSAPP_VERIFY_TOKEN`)
  and echoes the challenge.
- **POST** verifies the `X-Hub-Signature-256` HMAC against `WHATSAPP_APP_SECRET`
  (fails closed when the secret is unset), then parses the payload.

The helpers `verifyWhatsAppSignature` and `parseInboundMessages` live in
`packages/infrastructure/src/messaging/whatsapp-webhook.ts`. Inbound messages parse
into text, audio, or image variants (each carrying `from` and `messageId`).

**Abracode inbound.** When routing through the Abracode gateway, inbound arrives at
`apps/web/src/app/api/v1/webhooks/abracode/route.ts` instead. There is no
`hub.challenge` handshake; Abracode POSTs a normalized `{ type, data }` body signed
with `X-Abracode-Signature` (HMAC-SHA256 over the raw body with
`ABRACODE_WEBHOOK_SECRET`). `parseAbracodeInbound` maps it into the same
text/audio/image variants, and the same dedup, throttle, and assistant handling
apply.

**Multimodal configuration.** Audio transcription and image reading need
`GEMINI_API_KEY`. When it is unset, the assistant does not silently degrade: a
voice or image message gets a clear "I cannot understand voice or image messages
yet, please send text" reply (`MediaUnderstandingUnavailableError` →
`ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE`), rather than feeding a placeholder to the
model.

**Hardening.** After the signature check, each message is processed at most once:
`markMessageProcessed(messageId)` (`apps/web/src/server/api/whatsapp-dedup.ts`) does
an Upstash `SET NX` with a 24h TTL, so Meta retries are deduped. Each sender is then
rate limited (`checkWhatsappRateLimit`, 10 messages per 60s in
`apps/web/src/server/api/rate-limit.ts`). Both degrade to a graceful no-op when
Upstash is not configured, and the route always answers `200` so Meta does not
retry storm.

## Identity pairing

A WhatsApp number must be bound to an account before the agent acts as that user.
`ChannelIdentity` (`packages/domain/src/entities/channel-identity.ts`) holds the
`channel`, the E.164 `address`, a `pairingCode`, its `pairingExpiresAt`, and
`verifiedAt`, backed by the `message-channel` and `phone-number` value objects.

`startWhatsappPairing` (`POST /api/v1/messaging/whatsapp/pairing`, session-auth)
issues a time-boxed code (`PAIRING_CODE_TTL_MS`, 10 minutes). When the user sends
that code from WhatsApp, `handleInboundWhatsApp` links the sender on a valid,
unexpired code (bound to the inbound address). Until linked, the bot only replies
with guidance.

## Inbound orchestration

For a verified number, `handleInboundWhatsApp`
(`packages/application/src/use-cases/handle-inbound-whatsapp.ts`) runs:

1. **Identity:** resolve the sender to a Lifedeck user.
2. **Entitlement:** `EntitlementService.for(userId)` must grant `whatsappAssistant`
   (otherwise an upsell reply).
3. **Meter:** `consumeCredits` debits before the model call, metered by modality;
   `QuotaExceededError` returns a friendly quota reply.
4. **Agent:** `AgentRunner.run(...)` produces the reply.
5. **Reply and persist:** send via `MessagingChannel.sendText` and append the turn
   to the `ConversationStore`.

The webhook responds fast; the agent loop runs from the queued work, since Meta
retries on slow responses.

## The agent and tools

`AgentRunner` (port) is implemented by `AiSdkAgentRunner`
(`packages/infrastructure/src/messaging/ai-sdk-agent-runner.ts`) on the Vercel AI
SDK `generateText`. Provider resolution mirrors list generation: `GEMINI_API_KEY`
direct, else the `AI_MODEL` gateway, else a stub. Default model is Gemini Flash
(`GEMINI_MODEL_ID`); the registry caps tool steps with `stopWhen: stepCountIs(10)`,
enough for a read, a few mutations and the closing sentence in one turn.

Tools are thin adapters over existing use cases, exposed through the `AssistantTools`
port (`packages/application/src/ports/assistant-tools.ts`) and wired in the
container as the linked user. The surface covers reading and acting, not just
creating:

- **Read** (return ids the model threads into mutations): `getToday`, `getLists`,
  `getAgenda`.
- **Weather**: `getWeather` (read-only, no user data) geocodes a place and
  returns a daily forecast up to ~16 days ahead via Open-Meteo
  (`OpenMeteoWeatherProvider`, keyless), so the user can ask "will it rain in
  Lisbon this weekend?". `setDefaultWeatherLocation` saves (or clears) a default
  place on the user, surfaced back through `getContext`, so later "weather
  tomorrow?" asks need no location; the assistant offers to save it after the
  user first names a place and none is stored.
- **Tasks**: `addTask` (defaults to today's list, or a given `listId`; reuses a
  same-titled task already on that day instead of duplicating it, and takes
  `completed` for something the user has already done), `completeTask`,
  `reopenTask`, `renameTask`, `deleteTask`, `moveTaskToToday`.
- **Already did it**: `logActivity` takes the activity in the user's own words
  ("treinei ontem", "passeamos com a Rhaenyra") plus an optional date. It matches
  their habits, then that day's tasks, by title (accent- and conjugation-tolerant,
  `packages/application/src/shared/activity-match.ts`), logging the habit or
  completing the task it finds, and only creating an already-completed task when
  nothing matches. One call, so the model cannot land halfway: the recurring
  failure was a task added but left pending, or a confirmation with nothing
  recorded at all.
- **Lists / subtasks**: `createList`, `addSubtask`, `completeSubtask`.
- **Calendar**: `addEvent` (with description/location/all-day/reminders),
  `updateEvent` (also reschedule), `deleteEvent`.

Mutations reference an entity by id, so the model reads first (`getToday` /
`getAgenda` / `getLists`) then acts. Each call inherits the same authorization and
validation the REST API enforces.

### Verified confirmations

A model that answers "registrei seu treino" without calling anything is the worst
failure this surface has: the user is told it worked and only finds out later that
nothing changed. Two guards, since the prompt rule alone is not enough:

- `claimsUnbackedAction` compares the reply against first-person "I did it" verbs
  in the three supported languages. If one appears and no mutation tool ran, the
  turn is generated once more with a `CORRECTION` appended to the system prompt.
  The retry is safe precisely because nothing was mutated: only reads repeat.
- Every turn logs `assistant_turn` with the tools it ran, and a claim still
  unbacked after the retry logs `assistant_unverified_claim`. Before this, a turn
  that lied looked identical in the logs to one that worked.

Short-term context lives in `ConversationStore` (port) via
`RedisConversationStore` (`packages/infrastructure/src/messaging/redis-conversation-store.ts`):
a 20-turn rolling window with a 24h TTL on Upstash, falling back to in-memory.

## Multimodal

`Transcriber` and `VisionReader` ports back the Gemini adapters
(`packages/infrastructure/src/messaging/gemini-multimodal.ts`,
`GeminiTranscriber` / `GeminiVisionReader`; stubs without a key). The webhook parses
audio and image messages; the orchestrator meters by modality
(`audioTranscription` / `imageVision` = 2 credits versus `assistantText` = 1,
weights in `packages/domain/src/value-objects/ai-operation.ts`) before fetching the
media via `MessagingChannel.fetchMedia` (Meta two-step lookup plus download), then
transcribes or describes it and feeds the text to the agent.

## Pro routing for Premium

Premium users (the `premiumModel` entitlement) get their non-trivial text (a
word-count proxy, 8 or more words) routed to Gemini 3 Pro (`GEMINI_PRO_MODEL_ID`),
debited `assistantPro` = 6. Short messages and Flash-tier users stay
`assistantText` = 1. `AiSdkAgentRunner` holds both a flash and a pro model and picks
by the run input's model tier.

## Proactive alerts

Everything the assistant sends on its own initiative (calendar reminders, the daily
brief, habit check-ins, nudges) goes through `sendProactiveMessage`. It sends plain
text while Meta's 24-hour customer-service window is open, and a pre-approved
utility template once that window has closed. **With no template configured the
send is skipped**, silently as far as the user is concerned, and only a
`proactive_send_skipped` / `window_closed_no_template` warning is logged. That is
exactly how a Sunday brief went missing while Saturday's arrived: the user had
written on Friday, so Saturday was still inside the window and Sunday was not.

Two things follow from that:

- Configure a template for every proactive message, not just reminders. Each is
  optional, and each one left unset means that message only ever reaches users who
  happen to be inside the window.
- The brief, check-in and nudge also write an **in-app notification** whenever
  WhatsApp did not deliver, so the content lands in the notification bell instead
  of vanishing. Reminders already did this unconditionally.

### Template shapes

Template names are **code, not configuration**
(`apps/web/src/server/whatsapp-templates.ts`): they name things we own and are the
same in every environment, so an env var per template only created a way for
production to silently disagree with Meta. Renaming one there means re-registering
it here. A template that is missing or not yet approved makes the send fail loudly
(`proactive_send_failed`) and the message still reaches the user through the
notification bell.

A template body parameter cannot contain a line break, a tab, or four consecutive
spaces, and is capped at 1024 characters; Meta also rejects a body made only of
variables. `sendProactiveMessage` flattens every parameter (`toTemplateParam`), and
the daily brief passes a purpose-built one-line summary (`composeDailyBriefParam`)
rather than its bulleted text.

All four are `utility` category, and carry a `_v1` suffix: an approved body cannot
be edited freely, so changing the wording means registering the next version and
bumping the name in `whatsapp-templates.ts`. Each name is registered once with
three language versions, matching `whatsappLanguageForLocale`: **pt_BR**, **en_US**
and **es**, the codes `reminder_v1` is already approved under. These have to match
exactly: asking for `en` when the template was approved as `en_US` is a failed
send, not a graceful fallback. An unknown locale falls back to
`WHATSAPP_TEMPLATE_LANGUAGE` in `whatsapp-templates.ts` (`pt_BR`).

Meta also rejects a body that begins or ends with a variable, so every body below
keeps static copy on both sides.

**`reminder_v1`** — params: event title, localized start time. Already approved;
listed here for reference. `{{2}}` arrives as a full localized datetime
(`28 de jul. de 2026, 15:30`), so the copy around it should not assume a bare time.

| | |
| --- | --- |
| pt_BR | `Olá! Lembrete: "{{1}}" — {{2}}. Bom compromisso!` |
| en_US | `Hi! Reminder: "{{1}}" — {{2}}. Have a good one!` |
| es | `¡Hola! Recordatorio: "{{1}}" — {{2}}. ¡Que vaya bien!` |

**`daily_brief_v1`** — param: the one-line day summary from `composeDailyBriefParam`.

| | |
| --- | --- |
| pt_BR | `Seu resumo diário do Life Deck: {{1}}. Você ativou este resumo nas configurações do app.` |
| en_US | `Your Life Deck daily summary: {{1}}. You turned this summary on in the app settings.` |
| es | `Tu resumen diario de Life Deck: {{1}}. Activaste este resumen en los ajustes de la app.` |

**`habit_checkin_v1`** — param: the habit title.

| | |
| --- | --- |
| pt_BR | `Check-in do hábito "{{1}}" de hoje. Responda "sim" para registrar e manter sua sequência.` |
| en_US | `Today's check-in for your habit "{{1}}". Reply "yes" to log it and keep your streak.` |
| es | `Check-in de hoy para tu hábito "{{1}}". Responde "sí" para registrarlo y mantener tu racha.` |

**`nudge_v1`** — params: task title, days it has been on the list.

| | |
| --- | --- |
| pt_BR | `Atualização das suas tarefas: "{{1}}" está pendente há {{2}} dias. Responda para reagendar ou dividir em passos menores.` |
| en_US | `Task update: "{{1}}" has been pending for {{2}} days. Reply to reschedule it or break it into smaller steps.` |
| es | `Actualización de tus tareas: "{{1}}" lleva {{2}} días pendiente. Responde para reprogramarla o dividirla en pasos más pequeños.` |

### Keeping the category UTILITY

Meta re-categorizes on the copy, not on the category you pick, and silently: the
first `daily_brief_v1` draft was moved to MARKETING for greeting the user and
inviting them to open the app. That matters beyond price (roughly 10x per message
in Brazil): a MARKETING template obeys the recipient's marketing opt-out and Meta's
per-user marketing frequency cap, so it can be dropped without reaching us at all,
which is the failure this whole section exists to prevent.

So the proactive copy avoids, in every language:

- greetings and well-wishes ("Bom dia!", "Have a good one!")
- invitations to open, browse or come back to the app
- decorative emoji at the start of the body

and instead states plainly what changed in the user's own data, and that they
turned the message on. The free-form in-window copy (`composeDailyBrief` and
friends) is not subject to any of this and stays warm.

## Env vars

`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`,
`WHATSAPP_VERIFY_TOKEN`,
`GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_PRO_MODEL_ID`, `AI_MODEL`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. When the Abracode gateway
is used instead of Meta-direct: `ABRACODE_API_KEY`, `ABRACODE_FROM`,
`ABRACODE_BASE_URL`, `ABRACODE_PHONE_NUMBER_ID`, `ABRACODE_WEBHOOK_SECRET`.
