import type { EntityId } from '@lifedeck/domain'

export type DailyCompletion = {
  date: string
  total: number
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
    timeZone: string,
  ): Promise<DailyCompletion[]>
  totals(ownerId: EntityId): Promise<CompletionTotals>
}
