import type {
  ChannelIdentity,
  EntityId,
  MessageChannel,
} from '@lifedeck/domain'
import type { ChannelIdentityRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  toChannelIdentityRecord,
  toDomainChannelIdentity,
  type ChannelIdentityRecord,
} from '@/database/channel-identity-record'

function fromPrisma(record: {
  id: string
  userId: string
  channel: string
  address: string | null
  pairingCode: string | null
  pairingExpiresAt: Date | null
  verifiedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): ChannelIdentityRecord {
  return {
    id: record.id,
    userId: record.userId,
    channel: record.channel as MessageChannel,
    address: record.address,
    pairingCode: record.pairingCode,
    pairingExpiresAt: record.pairingExpiresAt,
    verifiedAt: record.verifiedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class PrismaChannelIdentityRepository
  implements ChannelIdentityRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(identity: ChannelIdentity): Promise<void> {
    const record = toChannelIdentityRecord(identity)
    await this.prisma.channelIdentity.upsert({
      where: { id: record.id },
      create: record,
      update: {
        address: record.address,
        pairingCode: record.pairingCode,
        pairingExpiresAt: record.pairingExpiresAt,
        verifiedAt: record.verifiedAt,
        updatedAt: record.updatedAt,
      },
    })
  }

  async findByUser(
    userId: EntityId,
    channel: MessageChannel,
  ): Promise<ChannelIdentity | null> {
    const row = await this.prisma.channelIdentity.findFirst({
      where: { userId: userId as string, channel },
    })
    return row ? toDomainChannelIdentity(fromPrisma(row)) : null
  }

  async findByAddress(
    channel: MessageChannel,
    address: string,
  ): Promise<ChannelIdentity | null> {
    const row = await this.prisma.channelIdentity.findFirst({
      where: { channel, address },
    })
    return row ? toDomainChannelIdentity(fromPrisma(row)) : null
  }

  async findPendingByCode(
    channel: MessageChannel,
    code: string,
  ): Promise<ChannelIdentity | null> {
    const row = await this.prisma.channelIdentity.findFirst({
      where: { channel, pairingCode: code, verifiedAt: null },
    })
    return row ? toDomainChannelIdentity(fromPrisma(row)) : null
  }
}
