import type { EntityId, PushDevice } from '@lifedeck/domain'
import type { PushDeviceRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  toDomainPushDevice,
  toPushDeviceRecord,
} from '@/database/push-device-record'

export class PrismaPushDeviceRepository implements PushDeviceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(device: PushDevice): Promise<void> {
    const record = toPushDeviceRecord(device)
    // Upserted on the token, not the id: the same installation re-registers on
    // every app start, and the id it was first stored under is not something the
    // app knows or sends back.
    await this.prisma.pushDevice.upsert({
      where: { token: record.token },
      create: record,
      update: {
        userId: record.userId,
        platform: record.platform,
        lastSeenAt: record.lastSeenAt,
      },
    })
  }

  async findByToken(token: string): Promise<PushDevice | null> {
    const record = await this.prisma.pushDevice.findUnique({
      where: { token },
    })
    return record ? toDomainPushDevice(record) : null
  }

  async listByUser(userId: EntityId): Promise<PushDevice[]> {
    const records = await this.prisma.pushDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    })
    return records.map(toDomainPushDevice)
  }

  async deleteByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return
    }
    await this.prisma.pushDevice.deleteMany({
      where: { token: { in: tokens } },
    })
  }
}
