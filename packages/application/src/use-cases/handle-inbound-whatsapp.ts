import { normalizePhone } from '@lifedeck/domain'
import { QuotaExceededError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { AgentRunner } from '@/ports/agent-runner'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { ConversationStore } from '@/ports/conversation-store'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { MessagingChannel } from '@/ports/messaging-channel'

export const PAIR_LINKED_MESSAGE =
  'Your WhatsApp is now linked to Lifedeck. You can start sending messages.'
export const PAIR_GUIDANCE_MESSAGE =
  'This number is not linked to a Lifedeck account yet. Open Lifedeck, start WhatsApp pairing, and send the code shown there.'
export const ASSISTANT_LOCKED_MESSAGE =
  'The Lifedeck assistant is part of a paid plan. Upgrade in the app to chat here.'
export const ASSISTANT_QUOTA_MESSAGE =
  'You have reached your usage limit for now. It will free up again soon.'
export const ASSISTANT_ERROR_MESSAGE =
  'Something went wrong on my side. Please try again in a moment.'

export type InboundWhatsappMessage = {
  from: string
  text: string
}

export type InboundWhatsappAction =
  | 'reply'
  | 'linked'
  | 'guidance'
  | 'denied'
  | 'quota'
  | 'error'

export type InboundWhatsappResult = {
  action: InboundWhatsappAction
}

type ConsumeCredits = (
  userId: string,
  operation: 'assistantText',
) => Promise<unknown>

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  entitlements: EntitlementService
  consumeCredits: ConsumeCredits
  agent: AgentRunner
  conversations: ConversationStore
  clock: Clock
}

export function makeHandleInboundWhatsApp({
  channelIdentities,
  messaging,
  entitlements,
  consumeCredits,
  agent,
  conversations,
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
    const code = message.text.trim()
    const pending = code
      ? await channelIdentities.findPendingByCode('whatsapp', code)
      : null

    if (pending && !pending.isCodeExpired(now)) {
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

    // Meter before the model call so an exhausted user never spends an AI call.
    try {
      await consumeCredits(userId, 'assistantText')
    } catch (error) {
      if (error instanceof QuotaExceededError) {
        await messaging.sendText(message.from, ASSISTANT_QUOTA_MESSAGE)
        return { action: 'quota' }
      }
      throw error
    }

    const history = await conversations.load(userId)
    let reply
    try {
      reply = await agent.run({ userId, message: message.text, history })
    } catch {
      await messaging.sendText(message.from, ASSISTANT_ERROR_MESSAGE)
      return { action: 'error' }
    }

    await conversations.append(userId, [
      { role: 'user', content: message.text },
      { role: 'assistant', content: reply.text },
    ])
    await messaging.sendText(message.from, reply.text)
    return { action: 'reply' }
  }
}
