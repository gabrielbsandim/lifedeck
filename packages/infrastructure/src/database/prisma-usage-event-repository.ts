import type { UsageEvent } from '@lifedeck/domain'
import type { UsageEventLedger } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { toUsageEventRecord } from '@/database/usage-event-record'

export class PrismaUsageEventRepository implements UsageEventLedger {
  constructor(private readonly prisma: PrismaClient) {}

  async record(event: UsageEvent): Promise<void> {
    const record = toUsageEventRecord(event)
    await this.prisma.usageEvent.create({
      data: {
        id: record.id,
        userId: record.userId,
        operation: record.operation,
        credits: record.credits,
        createdAt: record.createdAt,
      },
    })
  }
}
