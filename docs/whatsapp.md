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
(`GEMINI_MODEL_ID`); the registry caps tool steps with `stopWhen: stepCountIs(5)`.

Tools are thin adapters over existing use cases, exposed through the `AssistantTools`
port (`packages/application/src/ports/assistant-tools.ts`) and wired in the
container as the linked user. The surface covers reading and acting, not just
creating:

- **Read** (return ids the model threads into mutations): `getToday`, `getLists`,
  `getAgenda`.
- **Weather** (read-only, no user data): `getWeather` — geocodes a place and
  returns a daily forecast up to ~16 days ahead via Open-Meteo
  (`OpenMeteoWeatherProvider`, keyless), so the user can ask "will it rain in
  Lisbon this weekend?".
- **Tasks**: `addTask` (defaults to today's list, or a given `listId`),
  `completeTask`, `reopenTask`, `renameTask`, `deleteTask`, `moveTaskToToday`.
- **Lists / subtasks**: `createList`, `addSubtask`, `completeSubtask`.
- **Calendar**: `addEvent` (with description/location/all-day/reminders),
  `updateEvent` (also reschedule), `deleteEvent`.

Mutations reference an entity by id, so the model reads first (`getToday` /
`getAgenda` / `getLists`) then acts. Each call inherits the same authorization and
validation the REST API enforces.

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
word-count proxy, 8 or more words) routed to Gemini 3.1 Pro (`GEMINI_PRO_MODEL_ID`),
debited `assistantPro` = 6. Short messages and Flash-tier users stay
`assistantText` = 1. `AiSdkAgentRunner` holds both a flash and a pro model and picks
by the run input's model tier.

## Proactive alerts

Calendar reminders fired outside Meta's 24-hour window are sent as pre-approved
utility templates via `MessagingChannel.sendTemplate`. `deliverReminder` sends a
best-effort template (event title plus start time) when the user has a verified
number and `WHATSAPP_REMINDER_TEMPLATE` is set, alongside the in-app notification.

## Env vars

`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`,
`WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_REMINDER_TEMPLATE`, `WHATSAPP_TEMPLATE_LANGUAGE`,
`GEMINI_API_KEY`, `GEMINI_MODEL_ID`, `GEMINI_PRO_MODEL_ID`, `AI_MODEL`,
`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
