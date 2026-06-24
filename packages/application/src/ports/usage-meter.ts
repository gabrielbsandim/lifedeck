export type UsageWindow = 'fiveHour' | 'weekly'

export type UsageCounts = {
  fiveHour: number
  weekly: number
}

export interface UsageMeter {
  current(userId: string): Promise<UsageCounts>
  add(userId: string, credits: number): Promise<UsageCounts>
}
