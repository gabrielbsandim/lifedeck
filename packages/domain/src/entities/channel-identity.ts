import { ValidationError } from '@/shared/domain-error'
import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { MessageChannel } from '@/value-objects/message-channel'
import { isE164, normalizePhone } from '@/value-objects/phone-number'

export type ChannelIdentityProps = {
  id: EntityId
  userId: EntityId
  channel: MessageChannel
  address: string | null
  targetAddress: string | null
  pairingCode: string | null
  pairingExpiresAt: Date | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class ChannelIdentity {
  private constructor(private props: ChannelIdentityProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    channel: MessageChannel
    /**
     * The number the user declares they will message from. Optional: when the
     * app cannot know it (same-device flow, no phone input), we pair by code
     * alone and bind whichever number redeems it.
     */
    targetAddress?: string | null
    pairingCode: string
    pairingExpiresAt: Date
    now: Date
  }): ChannelIdentity {
    return new ChannelIdentity({
      id: input.id,
      userId: input.userId,
      channel: input.channel,
      address: null,
      targetAddress: input.targetAddress
        ? ChannelIdentity.requirePhone(input.targetAddress)
        : null,
      pairingCode: guard.notEmpty(input.pairingCode, 'Pairing code'),
      pairingExpiresAt: input.pairingExpiresAt,
      verifiedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  private static requirePhone(value: string): string {
    const normalized = normalizePhone(value)
    if (!isE164(normalized)) {
      throw new ValidationError('Target address is not a valid phone number.')
    }
    return normalized
  }

  static restore(props: ChannelIdentityProps): ChannelIdentity {
    return new ChannelIdentity({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get channel(): MessageChannel {
    return this.props.channel
  }

  get address(): string | null {
    return this.props.address
  }

  get targetAddress(): string | null {
    return this.props.targetAddress
  }

  get pairingCode(): string | null {
    return this.props.pairingCode
  }

  get pairingExpiresAt(): Date | null {
    return this.props.pairingExpiresAt
  }

  get verifiedAt(): Date | null {
    return this.props.verifiedAt
  }

  isVerified(): boolean {
    return this.props.verifiedAt !== null
  }

  isCodeExpired(now: Date): boolean {
    return (
      this.props.pairingExpiresAt === null || this.props.pairingExpiresAt <= now
    )
  }

  // Whether a given sender may redeem the pairing code. When the user declared a
  // number, only that number qualifies (blocks binding a stranger with a leaked
  // code). When no number was declared (same-device flow), any sender qualifies:
  // the code is short-lived and only ever shown inside the authenticated app.
  matchesTarget(address: string): boolean {
    if (this.props.targetAddress === null) {
      return true
    }
    return this.props.targetAddress === normalizePhone(address)
  }

  regenerateCode(
    pairingCode: string,
    pairingExpiresAt: Date,
    targetAddress: string | null,
    now: Date,
  ): void {
    if (this.isVerified()) {
      throw new ValidationError('Channel identity is already verified.')
    }
    this.props.pairingCode = guard.notEmpty(pairingCode, 'Pairing code')
    this.props.pairingExpiresAt = pairingExpiresAt
    this.props.targetAddress = targetAddress
      ? ChannelIdentity.requirePhone(targetAddress)
      : null
    this.props.updatedAt = now
  }

  verify(address: string, now: Date): void {
    const normalized = normalizePhone(address)
    if (!isE164(normalized)) {
      throw new ValidationError('Channel address is not a valid phone number.')
    }
    if (
      this.props.targetAddress !== null &&
      this.props.targetAddress !== normalized
    ) {
      throw new ValidationError(
        'Inbound address does not match the paired target.',
      )
    }
    this.props.address = normalized
    this.props.pairingCode = null
    this.props.pairingExpiresAt = null
    this.props.verifiedAt = now
    this.props.updatedAt = now
  }

  toJSON(): ChannelIdentityProps {
    return { ...this.props }
  }
}
