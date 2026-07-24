import { asEntityId } from '@lifedeck/domain'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'
import type { Logger } from '@/ports/logger'
import type {
  InteractiveButton,
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
  // Quick-reply buttons for the in-window send. Interactive messages are only
  // valid while the window is open, so once it closes we fall back to the plain
  // template (which cannot carry buttons).
  buttons?: InteractiveButton[]
}

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  messaging: MessagingChannel
  whatsappSession?: WhatsappSessionWindow
  logger: Logger
}

// The one place assistant-initiated WhatsApp messages go out: resolve the user's
// verified number, pick free-form text vs. template by the session window, and
// swallow failures so a proactive send never breaks the caller. Reused by
// reminders today and by the daily brief, nudges, and habit check-ins in V3.
//
// Every path that does not deliver is best-effort by design (the in-app
// notification is the reliable channel), which historically made a real problem
// — a de-linked number, a closed window with no template, a provider/account
// error (e.g. a blocked WhatsApp Business account) — invisible. Each such path
// now logs a warning so the reason is observable instead of vanishing.
export function makeSendProactiveMessage({
  channelIdentities,
  messaging,
  whatsappSession,
  logger,
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
      logger.warn('proactive_send_skipped', {
        userId,
        reason: 'no_verified_whatsapp',
      })
      return { delivered: false }
    }
    const windowOpen = whatsappSession
      ? await whatsappSession.isOpen(identity.address)
      : false
    try {
      if (windowOpen) {
        if (message.buttons && message.buttons.length > 0) {
          await messaging.sendButtons(
            identity.address,
            message.text,
            message.buttons,
          )
        } else {
          await messaging.sendText(identity.address, message.text)
        }
        return { delivered: true }
      }
      if (message.template) {
        await messaging.sendTemplate(identity.address, message.template)
        return { delivered: true }
      }
      // Outside WhatsApp's 24h window a free-form message is not allowed, so with
      // no approved template configured there is nothing we may send.
      logger.warn('proactive_send_skipped', {
        userId,
        reason: 'window_closed_no_template',
      })
      return { delivered: false }
    } catch (error) {
      // A thrown send is a real provider/account failure (rate limit, an
      // unapproved template, or a blocked WhatsApp Business account), not a
      // benign skip. Surface it so it is diagnosable, then swallow so a proactive
      // send never breaks the caller.
      logger.warn('proactive_send_failed', {
        userId,
        window: windowOpen ? 'open' : 'closed',
        error: error instanceof Error ? error.message : String(error),
      })
      return { delivered: false }
    }
  }
}
