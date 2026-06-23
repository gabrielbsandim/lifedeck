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
  ): Promise<DailyCompletion[]> {
    const rows = await this.prisma.$queryRaw<
      { date: string; completed: bigint }[]
    >`
      SELECT to_char(t.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
             COUNT(*) AS completed
      FROM tasks t
      JOIN lists l ON l.id = t.list_id
      WHERE l.owner_id = ${ownerId}
        AND t.status = 'completed'
        AND t.completed_at >= ${from}
        AND t.completed_at < ${toExclusive}
      GROUP BY 1
      ORDER BY 1
    `
    return rows.map(row => ({
      date: row.date,
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
