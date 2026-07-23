import type { AiOperation, MessageLanguage } from '@lifedeck/domain'
import {
  MediaUnderstandingUnavailableError,
  QuotaExceededError,
} from '@/errors/use-case-error'
import type { AgentAction, AgentRunner } from '@/ports/agent-runner'
import type { ConversationStore } from '@/ports/conversation-store'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { Logger } from '@/ports/logger'
import type { MediaPayload } from '@/ports/messaging-channel'
import type { Transcriber } from '@/ports/transcriber'
import type { VisionReader } from '@/ports/vision-reader'

// The in-app assistant chat: the SAME agent the user talks to over WhatsApp,
// surfaced inside the app. It reuses the agent, tools, conversation history
// (keyed by userId, so both channels share one memory) and credit metering, but
// drops everything WhatsApp-specific: no phone pairing, no outbound send (the
// reply is the HTTP response), no 24h session window. Media arrives as bytes the
// route already resolved from an upload, so there is no fetchMedia hop.

// A message the app sent on the user's behalf. Text, a voice note, or an image,
// mirroring the three modalities the WhatsApp path understands.
export type InAppMessage =
  | { userId: string; locale?: MessageLanguage; kind: 'text'; text: string }
  | {
      userId: string
      locale?: MessageLanguage
      kind: 'audio'
      audio: MediaPayload
    }
  | {
      userId: string
      locale?: MessageLanguage
      kind: 'image'
      image: MediaPayload
    }

// The route maps each status to an HTTP response: reply -> 200 with the body,
// denied -> 403, quota/busy -> 429, unconfigured -> 422, error -> 500. Only a
// successful reply carries text and action cards.
export type InAppAssistantResult =
  | { status: 'reply'; text: string; actions: AgentAction[] }
  | { status: 'denied' | 'quota' | 'unconfigured' | 'busy' | 'error' }

type ConsumeCredits = (
  userId: string,
  operation: AiOperation,
) => Promise<unknown>

type RefundCredits = (
  userId: string,
  operation: AiOperation,
) => Promise<unknown>

const OPERATION: Record<InAppMessage['kind'], AiOperation> = {
  text: 'assistantText',
  audio: 'audioTranscription',
  image: 'imageVision',
}

// Premium users get the stronger model for non-trivial text requests. Short
// messages stay on Flash so a quick "ok" never burns a Pro-weight credit.
const PRO_WORD_THRESHOLD = 8

// Stored as the user's turn when a voice note is understood directly (no
// transcription to store). The assistant's own reply carries the acted-on
// details, so a follow-up still has the context it needs.
const VOICE_NOTE_HISTORY_TEXT = '[voice message]'

// Language-neutral acknowledgement stored (and returned) when the model runs a
// tool but returns no words, so a completed action is always confirmed and the
// history never holds an empty assistant turn.
const DONE_COPY: Record<MessageLanguage, string> = {
  en: 'Done.',
  pt: 'Feito.',
  es: 'Hecho.',
}

function wantsProModel(granted: readonly string[], text: string): boolean {
  if (!granted.includes('premiumModel')) {
    return false
  }
  return text.trim().split(/\s+/).filter(Boolean).length >= PRO_WORD_THRESHOLD
}

/** True when the model call failed on a provider rate limit / quota, not a bug. */
function isRateLimitError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : String(error)
  ).toLowerCase()
  return (
    message.includes('quota') ||
    message.includes('rate limit') ||
    message.includes('rate-limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  )
}

type Dependencies = {
  entitlements: EntitlementService
  consumeCredits: ConsumeCredits
  refundCredits: RefundCredits
  agent: AgentRunner
  conversations: ConversationStore
  transcriber: Transcriber
  visionReader: VisionReader
  logger: Logger
}

export function makeHandleInAppMessage({
  entitlements,
  consumeCredits,
  refundCredits,
  agent,
  conversations,
  transcriber,
  visionReader,
  logger,
}: Dependencies) {
  return async function handleInAppMessage(
    message: InAppMessage,
  ): Promise<InAppAssistantResult> {
    const { userId } = message
    const { entitlements: granted } = await entitlements.for(userId)
    if (!granted.includes('whatsappAssistant')) {
      return { status: 'denied' }
    }

    // Refuse media we cannot read before metering, so an unconfigured
    // deployment never charges a credit for a transcription or vision read that
    // would fail loudly anyway.
    if (
      (message.kind === 'audio' && !transcriber.isAvailable()) ||
      (message.kind === 'image' && !visionReader.isAvailable())
    ) {
      return { status: 'unconfigured' }
    }

    const pro = message.kind === 'text' && wantsProModel(granted, message.text)
    const operation: AiOperation = pro
      ? 'assistantPro'
      : OPERATION[message.kind]

    // Meter before any model call so an exhausted user never spends one. The
    // credit weight follows the modality and the chosen model tier.
    try {
      await consumeCredits(userId, operation)
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        return { status: 'quota' }
      }
      logger.error('in_app_metering_failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { status: 'error' }
    }

    let reply
    let userTurn = ''
    try {
      const history = await conversations.load(userId)
      const modelTier = pro ? 'pro' : 'flash'
      if (message.kind === 'audio') {
        try {
          // Understand the voice note directly (multimodally), with the full
          // task/calendar context in the system prompt, instead of acting on a
          // lossy transcription that mishears domain words like "checkout".
          reply = await agent.run({
            userId,
            audio: message.audio,
            history,
            model: modelTier,
            entitlements: granted,
          })
          userTurn = VOICE_NOTE_HISTORY_TEXT
        } catch (directError) {
          // A rate limit would only recur on a second call, so let it surface
          // rather than doubling the load with a fallback.
          if (isRateLimitError(directError)) {
            throw directError
          }
          // Otherwise fall back to transcribing the same audio and running it as
          // text, so a voice note still lands if direct understanding fails.
          logger.warn('in_app_audio_direct_failed', {
            userId,
            error:
              directError instanceof Error
                ? directError.message
                : String(directError),
          })
          userTurn = await transcriber.transcribe(message.audio)
          reply = await agent.run({
            userId,
            message: userTurn,
            history,
            model: modelTier,
            entitlements: granted,
          })
        }
      } else if (message.kind === 'image') {
        userTurn = await visionReader.describe(message.image)
        reply = await agent.run({
          userId,
          message: userTurn,
          history,
          model: modelTier,
          entitlements: granted,
        })
      } else {
        userTurn = message.text
        reply = await agent.run({
          userId,
          message: userTurn,
          history,
          model: modelTier,
          entitlements: granted,
        })
      }
    } catch (error) {
      // The credit was metered before the model call; the call failed, so give
      // it back rather than charge for a reply the user never got.
      await refundCredits(userId, operation)
      if (error instanceof MediaUnderstandingUnavailableError) {
        return { status: 'unconfigured' }
      }
      // A model rate limit is transient and self-inflicted by rapid messaging;
      // tell the user to slow down instead of implying a real failure.
      if (isRateLimitError(error)) {
        logger.warn('in_app_assistant_rate_limited', { userId })
        return { status: 'busy' }
      }
      logger.error('in_app_assistant_failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      return { status: 'error' }
    }

    // The model sometimes runs a tool but returns no words; fall back to a short
    // acknowledgement so a completed action is always confirmed and history
    // never holds an empty assistant turn.
    const locale = message.locale ?? 'en'
    const replyText = reply.text.trim() ? reply.text : DONE_COPY[locale]
    // Persisting history must never cost the user their reply: if the store
    // fails, log it and still return the answer.
    try {
      await conversations.append(userId, [
        { role: 'user', content: userTurn },
        { role: 'assistant', content: replyText },
      ])
    } catch (error) {
      logger.error('in_app_history_append_failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    return { status: 'reply', text: replyText, actions: reply.actions ?? [] }
  }
}
