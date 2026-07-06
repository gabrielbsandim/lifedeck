import {
  ChannelIdentity,
  ValidationError,
  asEntityId,
  isE164,
  normalizePhone,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { CodeGenerator } from '@/ports/code-generator'
import type { IdGenerator } from '@/ports/id-generator'
import type { ChannelIdentityRepository } from '@/ports/channel-identity-repository'

export const PAIRING_CODE_TTL_MS = 10 * 60_000

export type WhatsappPairingResult =
  | { status: 'pending'; code: string; expiresAt: Date; target: string }
  | { status: 'linked'; address: string }

type Dependencies = {
  channelIdentities: ChannelIdentityRepository
  codes: CodeGenerator
  ids: IdGenerator
  clock: Clock
}

export function makeStartWhatsappPairing({
  channelIdentities,
  codes,
  ids,
  clock,
}: Dependencies) {
  return async function startWhatsappPairing(
    userId: string,
    targetPhone: string,
  ): Promise<WhatsappPairingResult> {
    // The user declares which WhatsApp number they will message from. Only that
    // number can later redeem the code, so a leaked code cannot bind a stranger.
    const target = normalizePhone(targetPhone)
    if (!isE164(target)) {
      throw new ValidationError(
        'Enter a valid WhatsApp number with country code.',
      )
    }

    const now = clock.now()
    const existing = await channelIdentities.findByUser(
      asEntityId(userId),
      'whatsapp',
    )

    if (existing?.isVerified()) {
      return { status: 'linked', address: existing.address as string }
    }

    const code = codes.generate()
    const expiresAt = new Date(now.getTime() + PAIRING_CODE_TTL_MS)
    if (existing) {
      existing.regenerateCode(code, expiresAt, target, now)
      await channelIdentities.save(existing)
      return { status: 'pending', code, expiresAt, target }
    }

    const identity = ChannelIdentity.create({
      id: ids.generate(),
      userId: asEntityId(userId),
      channel: 'whatsapp',
      targetAddress: target,
      pairingCode: code,
      pairingExpiresAt: expiresAt,
      now,
    })
    await channelIdentities.save(identity)
    return { status: 'pending', code, expiresAt, target }
  }
}
