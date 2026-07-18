import {
  detectMessageLanguage,
  normalizePhone,
  toMessageLanguage,
  type AiOperation,
  type MessageLanguage,
} from '@lifedeck/domain'
import {
  MediaUnderstandingUnavailableError,
  QuotaExceededError,
} from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { Logger } from '@/ports/logger'
import type { AgentRunner } from '@/ports/agent-runner'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { ConversationStore } from '@/ports/conversation-store'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { MessagingChannel } from '@/ports/messaging-channel'
import type { Transcriber } from '@/ports/transcriber'
import type { UserRepository } from '@/ports/user-repository'
import type { VisionReader } from '@/ports/vision-reader'

export type WhatsappCopy = {
  pairLinked: string
  pairGuidance: string
  pairWrongNumber: string
  assistantLocked: string
  assistantQuota: string
  assistantError: string
  assistantMediaUnavailable: string
  assistantDone: string
  assistantBusy: string
}

/**
 * System replies sent over WhatsApp, in the three languages Lifedeck speaks.
 * These live here (not in the i18n presentation package) so the use case can
 * pick a language without the application layer depending on i18n. The reply
 * language is the paired user's saved locale, or the detected language of the
 * incoming message for an unknown number, falling back to English.
 */
export const WHATSAPP_COPY: Record<MessageLanguage, WhatsappCopy> = {
  en: {
    pairLinked:
      'Your WhatsApp is now linked to Lifedeck. You can start sending messages.',
    pairGuidance:
      'This number is not linked to a Lifedeck account yet. Open Lifedeck, start WhatsApp pairing, and send the code shown there.',
    pairWrongNumber:
      'This code was generated for a different WhatsApp number. Open Lifedeck and start pairing from the number you are messaging with now.',
    assistantLocked:
      'The Lifedeck assistant is part of a paid plan. Upgrade in the app to chat here.',
    assistantQuota:
      'You have reached your usage limit for now. It will free up again soon.',
    assistantError:
      'Something went wrong on my side. Please try again in a moment.',
    assistantMediaUnavailable:
      'I cannot understand voice or image messages yet. Please send your request as text.',
    assistantDone: 'Done.',
    assistantBusy:
      'I am handling a lot of messages right now. Please try again in a moment.',
  },
  pt: {
    pairLinked:
      'Seu WhatsApp agora está vinculado ao Lifedeck. Você já pode enviar mensagens.',
    pairGuidance:
      'Este número ainda não está vinculado a uma conta Lifedeck. Abra o Lifedeck, inicie o pareamento do WhatsApp e envie o código exibido lá.',
    pairWrongNumber:
      'Este código foi gerado para outro número de WhatsApp. Abra o Lifedeck e inicie o pareamento a partir do número que você está usando agora.',
    assistantLocked:
      'O assistente do Lifedeck faz parte de um plano pago. Faça upgrade no app para conversar aqui.',
    assistantQuota:
      'Você atingiu seu limite de uso por enquanto. Ele será liberado novamente em breve.',
    assistantError:
      'Algo deu errado do meu lado. Tente novamente em instantes.',
    assistantMediaUnavailable:
      'Ainda não consigo entender mensagens de voz ou imagem. Por favor, envie seu pedido como texto.',
    assistantDone: 'Feito.',
    assistantBusy:
      'Estou recebendo muitas mensagens agora. Tente novamente em instantes.',
  },
  es: {
    pairLinked:
      'Tu WhatsApp ya está vinculado a Lifedeck. Puedes empezar a enviar mensajes.',
    pairGuidance:
      'Este número aún no está vinculado a una cuenta de Lifedeck. Abre Lifedeck, inicia el emparejamiento de WhatsApp y envía el código que aparece allí.',
    pairWrongNumber:
      'Este código se generó para otro número de WhatsApp. Abre Lifedeck e inicia el emparejamiento desde el número con el que estás escribiendo ahora.',
    assistantLocked:
      'El asistente de Lifedeck es parte de un plan de pago. Mejora tu plan en la app para chatear aquí.',
    assistantQuota:
      'Has alcanzado tu límite de uso por ahora. Se liberará de nuevo pronto.',
    assistantError:
      'Algo salió mal de mi lado. Inténtalo de nuevo en un momento.',
    assistantMediaUnavailable:
      'Todavía no puedo entender mensajes de voz o imagen. Por favor, envía tu solicitud como texto.',
    assistantDone: 'Hecho.',
    assistantBusy:
      'Estoy recibiendo muchos mensajes ahora. Inténtalo de nuevo en un momento.',
  },
}

// Back-compat English aliases, still imported by callers and tests.
export const PAIR_LINKED_MESSAGE = WHATSAPP_COPY.en.pairLinked
export const PAIR_GUIDANCE_MESSAGE = WHATSAPP_COPY.en.pairGuidance
export const PAIR_WRONG_NUMBER_MESSAGE = WHATSAPP_COPY.en.pairWrongNumber
export const ASSISTANT_LOCKED_MESSAGE = WHATSAPP_COPY.en.assistantLocked
export const ASSISTANT_QUOTA_MESSAGE = WHATSAPP_COPY.en.assistantQuota
export const ASSISTANT_ERROR_MESSAGE = WHATSAPP_COPY.en.assistantError
export const ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE =
  WHATSAPP_COPY.en.assistantMediaUnavailable

export type InboundWhatsappMessage =
  | { from: string; kind: 'text'; text: string }
  | { from: string; kind: 'audio'; mediaId: string }
  | { from: string; kind: 'image'; mediaId: string }

export type InboundWhatsappAction =
  | 'reply'
  | 'linked'
  | 'guidance'
  | 'mismatch'
  | 'denied'
  | 'quota'
  | 'unconfigured'
  | 'error'

export type InboundWhatsappResult = {
  action: InboundWhatsappAction
}

type ConsumeCredits = (
  userId: string,
  operation: AiOperation,
) => Promise<unknown>

type RefundCredits = (
  userId: string,
  operation: AiOperation,
) => Promise<unknown>

const OPERATION: Record<InboundWhatsappMessage['kind'], AiOperation> = {
  text: 'assistantText',
  audio: 'audioTranscription',
  image: 'imageVision',
}

// Premium users get the stronger model for non-trivial text requests. Short
// messages stay on Flash so a quick "ok" never burns a Pro-weight credit.
const PRO_WORD_THRESHOLD = 8

// Pull the 6-digit pairing code out of an inbound message. The app sends a
// friendly sentence ("...My code: 123456") instead of a bare code, so the user
// understands what they are sending; we still pair as long as the code is in
// there. A bare "123456" (older links, manual send) matches too.
export function extractPairingCode(text: string): string {
  return text.match(/\d{6}/)?.[0] ?? ''
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
  channelIdentities: ChannelIdentityRepository
  users: UserRepository
  messaging: MessagingChannel
  entitlements: EntitlementService
  consumeCredits: ConsumeCredits
  refundCredits: RefundCredits
  agent: AgentRunner
  conversations: ConversationStore
  transcriber: Transcriber
  visionReader: VisionReader
  clock: Clock
  logger: Logger
}

export function makeHandleInboundWhatsApp({
  channelIdentities,
  users,
  messaging,
  entitlements,
  consumeCredits,
  refundCredits,
  agent,
  conversations,
  transcriber,
  visionReader,
  clock,
  logger,
}: Dependencies) {
  return async function handleInboundWhatsApp(
    message: InboundWhatsappMessage,
  ): Promise<InboundWhatsappResult> {
    const address = normalizePhone(message.from)
    const identity = await channelIdentities.findByAddress('whatsapp', address)

    if (identity?.isVerified()) {
      // System replies mirror the language the user wrote in, the same way the
      // assistant itself answers. For a non-text message (no words to detect)
      // we fall back to the account's saved language.
      const locale =
        message.kind === 'text'
          ? detectMessageLanguage(message.text)
          : toMessageLanguage((await users.findById(identity.userId))?.locale)
      return assist(identity.userId as string, message, locale)
    }

    // An unknown number gets the reply in the language it wrote in.
    const locale =
      message.kind === 'text' ? detectMessageLanguage(message.text) : 'en'
    const copy = WHATSAPP_COPY[locale]

    const now = clock.now()
    const code = message.kind === 'text' ? extractPairingCode(message.text) : ''
    const pending = code
      ? await channelIdentities.findPendingByCode('whatsapp', code)
      : null

    if (pending && !pending.isCodeExpired(now)) {
      // The code is valid, but it only links the number the user declared in
      // the app. A correct code sent from any other number is refused.
      if (!pending.matchesTarget(message.from)) {
        await messaging.sendText(message.from, copy.pairWrongNumber)
        return { action: 'mismatch' }
      }
      pending.verify(message.from, now)
      await channelIdentities.save(pending)
      await messaging.sendText(message.from, copy.pairLinked)
      return { action: 'linked' }
    }

    await messaging.sendText(message.from, copy.pairGuidance)
    return { action: 'guidance' }
  }

  async function assist(
    userId: string,
    message: InboundWhatsappMessage,
    locale: MessageLanguage,
  ): Promise<InboundWhatsappResult> {
    const copy = WHATSAPP_COPY[locale]
    const { entitlements: granted } = await entitlements.for(userId)
    if (!granted.includes('whatsappAssistant')) {
      await messaging.sendText(message.from, copy.assistantLocked)
      return { action: 'denied' }
    }

    // Refuse media we cannot read before metering, so an unconfigured
    // deployment never charges a credit for a transcription or vision read
    // that would fail loudly anyway.
    if (
      (message.kind === 'audio' && !transcriber.isAvailable()) ||
      (message.kind === 'image' && !visionReader.isAvailable())
    ) {
      await messaging.sendText(message.from, copy.assistantMediaUnavailable)
      return { action: 'unconfigured' }
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
        await messaging.sendText(message.from, copy.assistantQuota)
        return { action: 'quota' }
      }
      throw error
    }

    let reply
    let text
    try {
      text = await toText(message)
      const history = await conversations.load(userId)
      reply = await agent.run({
        userId,
        message: text,
        history,
        model: pro ? 'pro' : 'flash',
      })
    } catch (error) {
      // The credit was metered before the model call; the call failed, so give
      // it back rather than charge for a reply the user never got.
      await refundCredits(userId, operation)
      if (error instanceof MediaUnderstandingUnavailableError) {
        await messaging.sendText(message.from, copy.assistantMediaUnavailable)
        return { action: 'unconfigured' }
      }
      // A model rate limit is transient and self-inflicted by rapid messaging;
      // tell the user to slow down instead of implying a real failure.
      if (isRateLimitError(error)) {
        logger.warn('whatsapp_assistant_rate_limited', { userId })
        await messaging.sendText(message.from, copy.assistantBusy)
        return { action: 'error' }
      }
      // Surface the failure: without this the user sees a generic apology and
      // the cause is invisible in logs.
      logger.error('whatsapp_assistant_failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      await messaging.sendText(message.from, copy.assistantError)
      return { action: 'error' }
    }

    // The model sometimes runs a tool but returns no words; sending an empty
    // body is rejected by the channel and the user gets nothing. Fall back to a
    // short acknowledgement so a completed action is always confirmed.
    const replyText = reply.text.trim() ? reply.text : copy.assistantDone
    await conversations.append(userId, [
      { role: 'user', content: text },
      { role: 'assistant', content: replyText },
    ])
    await messaging.sendText(message.from, replyText)
    return { action: 'reply' }
  }

  async function toText(message: InboundWhatsappMessage): Promise<string> {
    if (message.kind === 'text') {
      return message.text
    }
    const media = await messaging.fetchMedia(message.mediaId)
    if (message.kind === 'audio') {
      return transcriber.transcribe(media)
    }
    return visionReader.describe(media)
  }
}
