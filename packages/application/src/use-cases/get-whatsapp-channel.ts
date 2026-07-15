import { asEntityId } from '@lifedeck/domain'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'

export type WhatsappChannelStatus =
  | { status: 'linked'; address: string }
  | { status: 'pending' }
  | { status: 'none' }

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
}

/**
 * Read-only view of the signed-in account's WhatsApp link, used by the UI to
 * poll for completion: once the user sends the pairing code, the status flips
 * to `linked` and the connect card confirms on its own.
 */
export function makeGetWhatsappChannel({ channelIdentities }: Dependencies) {
  return async function getWhatsappChannel(
    userId: string,
  ): Promise<WhatsappChannelStatus> {
    const identity = await channelIdentities.findByUser(
      asEntityId(userId),
      'whatsapp',
    )
    if (!identity) {
      return { status: 'none' }
    }
    if (identity.isVerified()) {
      return { status: 'linked', address: identity.address as string }
    }
    return { status: 'pending' }
  }
}
