import { normalizePhone, type AiOperation } from '@lifedeck/domain'
import {
  MediaUnderstandingUnavailableError,
  QuotaExceededError,
} from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { AgentRunner } from '@/ports/agent-runner'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { ConversationStore } from '@/ports/conversation-store'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { MessagingChannel } from '@/ports/messaging-channel'
import type { Transcriber } from '@/ports/transcriber'
import type { VisionReader } from '@/ports/vision-reader'

export const PAIR_LINKED_MESSAGE =
  'Your WhatsApp is now linked to Lifedeck. You can start sending messages.'
export const PAIR_GUIDANCE_MESSAGE =
  'This number is not linked to a Lifedeck account yet. Open Lifedeck, start WhatsApp pairing, and send the code shown there.'
export const PAIR_WRONG_NUMBER_MESSAGE =
  'This code was generated for a different WhatsApp number. Open Lifedeck and start pairing from the number you are messaging with now.'
export const ASSISTANT_LOCKED_MESSAGE =
  'The Lifedeck assistant is part of a paid plan. Upgrade in the app to chat here.'
export const ASSISTANT_QUOTA_MESSAGE =
  'You have reached your usage limit for now. It will free up again soon.'
export const ASSISTANT_ERROR_MESSAGE =
  'Something went wrong on my side. Please try again in a moment.'
export const ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE =
  'I cannot understand voice or image messages yet. Please send your request as text.'

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

const OPERATION: Record<InboundWhatsappMessage['kind'], AiOperation> = {
  text: 'assistantText',
  audio: 'audioTranscription',
  image: 'imageVision',
}

// Premium users get the stronger model for non-trivial text requests. Short
// messages stay on Flash so a quick "ok" never burns a Pro-weight credit.
const PRO_WORD_THRESHOLD = 8

function wantsProModel(granted: readonly string[], text: string): boolean {
  if (!granted.includes('premiumModel')) {
    return false
  }
  return text.trim().split(/\s+/).filter(Boolean).length >= PRO_WORD_THRESHOLD
}

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  entitlements: EntitlementService
  consumeCredits: ConsumeCredits
  agent: AgentRunner
  conversations: ConversationStore
  transcriber: Transcriber
  visionReader: VisionReader
  clock: Clock
}

export function makeHandleInboundWhatsApp({
  channelIdentities,
  messaging,
  entitlements,
  consumeCredits,
  agent,
  conversations,
  transcriber,
  visionReader,
  clock,
}: Dependencies) {
  return async function handleInboundWhatsApp(
    message: InboundWhatsappMessage,
  ): Promise<InboundWhatsappResult> {
    const address = normalizePhone(message.from)
    const identity = await channelIdentities.findByAddress('whatsapp', address)

    if (identity?.isVerified()) {
      return assist(identity.userId as string, message)
    }

    const now = clock.now()
    const code = message.kind === 'text' ? message.text.trim() : ''
    const pending = code
      ? await channelIdentities.findPendingByCode('whatsapp', code)
      : null

    if (pending && !pending.isCodeExpired(now)) {
      // The code is valid, but it only links the number the user declared in
      // the app. A correct code sent from any other number is refused.
      if (!pending.matchesTarget(message.from)) {
        await messaging.sendText(message.from, PAIR_WRONG_NUMBER_MESSAGE)
        return { action: 'mismatch' }
      }
      pending.verify(message.from, now)
      await channelIdentities.save(pending)
      await messaging.sendText(message.from, PAIR_LINKED_MESSAGE)
      return { action: 'linked' }
    }

    await messaging.sendText(message.from, PAIR_GUIDANCE_MESSAGE)
    return { action: 'guidance' }
  }

  async function assist(
    userId: string,
    message: InboundWhatsappMessage,
  ): Promise<InboundWhatsappResult> {
    const { entitlements: granted } = await entitlements.for(userId)
    if (!granted.includes('whatsappAssistant')) {
      await messaging.sendText(message.from, ASSISTANT_LOCKED_MESSAGE)
      return { action: 'denied' }
    }

    // Refuse media we cannot read before metering, so an unconfigured
    // deployment never charges a credit for a transcription or vision read
    // that would fail loudly anyway.
    if (
      (message.kind === 'audio' && !transcriber.isAvailable()) ||
      (message.kind === 'image' && !visionReader.isAvailable())
    ) {
      await messaging.sendText(
        message.from,
        ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE,
      )
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
        await messaging.sendText(message.from, ASSISTANT_QUOTA_MESSAGE)
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
      if (error instanceof MediaUnderstandingUnavailableError) {
        await messaging.sendText(
          message.from,
          ASSISTANT_MEDIA_UNAVAILABLE_MESSAGE,
        )
        return { action: 'unconfigured' }
      }
      await messaging.sendText(message.from, ASSISTANT_ERROR_MESSAGE)
      return { action: 'error' }
    }

    await conversations.append(userId, [
      { role: 'user', content: text },
      { role: 'assistant', content: reply.text },
    ])
    await messaging.sendText(message.from, reply.text)
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
