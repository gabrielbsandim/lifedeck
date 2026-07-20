import type { EntityId } from '@lifedeck/domain'
import type { NudgeLogEntry, NudgeLogRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

export class PrismaNudgeLogRepository implements NudgeLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async hasSentOn(userId: EntityId, date: string): Promise<boolean> {
    const row = await this.prisma.nudgeLog.findFirst({
      where: { userId, date },
      select: { id: true },
    })
    return row !== null
  }

  async lastSentDate(userId: EntityId, key: string): Promise<string | null> {
    const row = await this.prisma.nudgeLog.findFirst({
      where: { userId, key },
      orderBy: { date: 'desc' },
      select: { date: true },
    })
    return row?.date ?? null
  }

  async record(entry: NudgeLogEntry): Promise<void> {
    await this.prisma.nudgeLog.create({
      data: {
        id: entry.id,
        userId: entry.userId,
        key: entry.key,
        date: entry.date,
        createdAt: entry.createdAt,
      },
    })
  }
}
