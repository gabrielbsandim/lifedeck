import { asEntityId } from '@lifedeck/domain'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type {
  MessageTemplate,
  MessagingChannel,
} from '@/ports/messaging-channel'
import type { WhatsappSessionWindow } from '@/ports/whatsapp-session'

export type ProactiveMessage = {
  // Free-form text, sent while WhatsApp's 24h customer-service window is open
  // (the user messaged us recently).
  text: string
  // Pre-approved utility template, sent once the window has closed. Omit to send
  // only when the window is open (in-app/other channels cover the rest).
  template?: MessageTemplate
}

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  whatsappSession?: WhatsappSessionWindow
}

// The one place assistant-initiated WhatsApp messages go out: resolve the user's
// verified number, pick free-form text vs. template by the session window, and
// swallow failures so a proactive send never breaks the caller. Reused by
// reminders today and by the daily brief, nudges, and habit check-ins in V3.
export function makeSendProactiveMessage({
  channelIdentities,
  messaging,
  whatsappSession,
}: Dependencies) {
  return async function sendProactiveMessage(
    userId: string,
    message: ProactiveMessage,
  ): Promise<{ delivered: boolean }> {
    const identity = await channelIdentities.findByUser(
      asEntityId(userId),
      'whatsapp',
    )
    if (!identity?.isVerified() || !identity.address) {
      return { delivered: false }
    }
    const windowOpen = whatsappSession
      ? await whatsappSession.isOpen(identity.address)
      : false
    try {
      if (windowOpen) {
        await messaging.sendText(identity.address, message.text)
        return { delivered: true }
      }
      if (message.template) {
        await messaging.sendTemplate(identity.address, message.template)
        return { delivered: true }
      }
      return { delivered: false }
    } catch {
      // Best-effort: the in-app notification (or the caller's own fallback) is
      // the reliable channel, so a failed WhatsApp send is swallowed.
      return { delivered: false }
    }
  }
}
