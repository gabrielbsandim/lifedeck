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
    pairingCode: string
    pairingExpiresAt: Date
    now: Date
  }): ChannelIdentity {
    return new ChannelIdentity({
      id: input.id,
      userId: input.userId,
      channel: input.channel,
      address: null,
      pairingCode: guard.notEmpty(input.pairingCode, 'Pairing code'),
      pairingExpiresAt: input.pairingExpiresAt,
      verifiedAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
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

  regenerateCode(pairingCode: string, pairingExpiresAt: Date, now: Date): void {
    if (this.isVerified()) {
      throw new ValidationError('Channel identity is already verified.')
    }
    this.props.pairingCode = guard.notEmpty(pairingCode, 'Pairing code')
    this.props.pairingExpiresAt = pairingExpiresAt
    this.props.updatedAt = now
  }

  verify(address: string, now: Date): void {
    const normalized = normalizePhone(address)
    if (!isE164(normalized)) {
      throw new ValidationError('Channel address is not a valid phone number.')
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
