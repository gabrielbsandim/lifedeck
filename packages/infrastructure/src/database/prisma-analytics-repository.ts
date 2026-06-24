import type { EntityId } from '@lifedeck/domain'
import type {
  AnalyticsRepository,
  CompletionTotals,
  DailyCompletion,
} from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async completionsByDay(
    ownerId: EntityId,
    from: Date,
    toExclusive: Date,
    _timeZone: string,
  ): Promise<DailyCompletion[]> {
    const rows = await this.prisma.$queryRaw<
      { date: string; total: bigint; completed: bigint }[]
    >`
      SELECT to_char(l.reference_date, 'YYYY-MM-DD') AS date,
             COUNT(*) AS total,
             COUNT(*) FILTER (WHERE t.status = 'completed') AS completed
      FROM tasks t
      JOIN lists l ON l.id = t.list_id
      WHERE l.owner_id = ${ownerId}
        AND l.type = 'daily'
        AND l.reference_date >= ${from}
        AND l.reference_date < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `
    return rows.map(row => ({
      date: row.date,
      total: Number(row.total),
      completed: Number(row.completed),
    }))
  }

  async totals(ownerId: EntityId): Promise<CompletionTotals> {
    const rows = await this.prisma.$queryRaw<
      { total: bigint; completed: bigint }[]
    >`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE t.status = 'completed') AS completed
      FROM tasks t
      JOIN lists l ON l.id = t.list_id
      WHERE l.owner_id = ${ownerId}
    `
    const row = rows[0]
    return {
      total: row ? Number(row.total) : 0,
      completed: row ? Number(row.completed) : 0,
    }
  }
}
