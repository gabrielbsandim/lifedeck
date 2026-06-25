import {
  ChannelIdentity,
  asEntityId,
  type MessageChannel,
} from '@lifedeck/domain'

export type ChannelIdentityRecord = {
  id: string
  userId: string
  channel: MessageChannel
  address: string | null
  pairingCode: string | null
  pairingExpiresAt: Date | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainChannelIdentity(
  record: ChannelIdentityRecord,
): ChannelIdentity {
  return ChannelIdentity.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    channel: record.channel,
    address: record.address,
    pairingCode: record.pairingCode,
    pairingExpiresAt: record.pairingExpiresAt,
    verifiedAt: record.verifiedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export function toChannelIdentityRecord(
  identity: ChannelIdentity,
): ChannelIdentityRecord {
  const props = identity.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    channel: props.channel,
    address: props.address,
    pairingCode: props.pairingCode,
    pairingExpiresAt: props.pairingExpiresAt,
    verifiedAt: props.verifiedAt,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }
}
