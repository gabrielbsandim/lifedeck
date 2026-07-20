import type { EntityId, HabitLog } from '@lifedeck/domain'
import type { HabitLogRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainHabitLog, toHabitLogRecord } from '@/database/habit-log-record'

export class PrismaHabitLogRepository implements HabitLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(log: HabitLog): Promise<void> {
    const record = toHabitLogRecord(log)
    // Upsert on the unique (habit, date) so a repeated log for the same day is a
    // no-op instead of a constraint error.
    await this.prisma.habitLog.upsert({
      where: {
        habitId_date: { habitId: record.habitId, date: record.date },
      },
      create: record,
      update: {},
    })
  }

  async findByHabitAndDate(
    habitId: EntityId,
    date: string,
  ): Promise<HabitLog | null> {
    const row = await this.prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date } },
    })
    return row ? toDomainHabitLog(row) : null
  }

  async listByHabitsSince(
    habitIds: EntityId[],
    since: string,
  ): Promise<HabitLog[]> {
    const rows = await this.prisma.habitLog.findMany({
      where: { habitId: { in: habitIds }, date: { gte: since } },
    })
    return rows.map(toDomainHabitLog)
  }

  async deleteByHabitAndDate(habitId: EntityId, date: string): Promise<void> {
    await this.prisma.habitLog.deleteMany({ where: { habitId, date } })
  }
}
