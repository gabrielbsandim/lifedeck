import { normalizePhone } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { MessagingChannel } from '@/ports/messaging-channel'

export const PAIR_LINKED_MESSAGE =
  'Your WhatsApp is now linked to Lifedeck. You can start sending messages.'
export const PAIR_GUIDANCE_MESSAGE =
  'This number is not linked to a Lifedeck account yet. Open Lifedeck, start WhatsApp pairing, and send the code shown there.'

export type InboundWhatsappMessage = {
  from: string
  text: string
}

export type InboundWhatsappResult = {
  action: 'echo' | 'linked' | 'guidance'
}

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  clock: Clock
}

export function makeHandleInboundWhatsApp({
  channelIdentities,
  messaging,
  clock,
}: Dependencies) {
  return async function handleInboundWhatsApp(
    message: InboundWhatsappMessage,
  ): Promise<InboundWhatsappResult> {
    const address = normalizePhone(message.from)
    const identity = await channelIdentities.findByAddress('whatsapp', address)

    if (identity?.isVerified()) {
      // V2-7 milestone: a verified number gets an echo. V2-8 replaces this with
      // the AI assistant running over the existing use cases.
      await messaging.sendText(message.from, `You said: ${message.text}`)
      return { action: 'echo' }
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
}
