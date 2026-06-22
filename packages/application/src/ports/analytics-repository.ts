import type { EntityId } from '@taskin/domain'

export type DailyCompletion = {
  date: string
  completed: number
}

export type CompletionTotals = {
  total: number
  completed: number
}

export interface AnalyticsRepository {
  completionsByDay(
    ownerId: EntityId,
    from: Date,
    toExclusive: Date,
  ): Promise<DailyCompletion[]>
  totals(ownerId: EntityId): Promise<CompletionTotals>
}
