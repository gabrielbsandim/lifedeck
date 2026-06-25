export type UsageWindow = 'fiveHour' | 'weekly'

export type UsageCounts = {
  fiveHour: number
  weekly: number
}

export type ConsumeResult =
  | { ok: true; counts: UsageCounts }
  | { ok: false; window: UsageWindow; used: number }

export interface UsageMeter {
  current(userId: string): Promise<UsageCounts>
  add(userId: string, credits: number): Promise<UsageCounts>
  consume(
    userId: string,
    credits: number,
    limits: UsageCounts,
  ): Promise<ConsumeResult>
}
