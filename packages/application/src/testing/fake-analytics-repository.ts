import type {
  AnalyticsRepository,
  CompletionTotals,
  DailyCompletion,
} from '@/ports/analytics-repository'

export class FakeAnalyticsRepository implements AnalyticsRepository {
  constructor(
    private readonly rows: DailyCompletion[] = [],
    private readonly totalsValue: CompletionTotals = { total: 0, completed: 0 },
  ) {}

  async completionsByDay(): Promise<DailyCompletion[]> {
    return this.rows
  }

  async totals(): Promise<CompletionTotals> {
    return this.totalsValue
  }
}
