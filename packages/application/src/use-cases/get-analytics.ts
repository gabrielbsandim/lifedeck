import {
  asEntityId,
  startOfCivilDay,
  DEFAULT_TIME_ZONE,
} from '@lifedeck/domain'
import { type AnalyticsView } from '@/dtos/analytics-dto'
import type { AnalyticsRepository } from '@/ports/analytics-repository'
import type { Clock } from '@/ports/clock'
import type { UserRepository } from '@/ports/user-repository'

const DEFAULT_DAYS = 30
const MAX_DAYS = 365
const DAY_MS = 86_400_000

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type Dependencies = {
  analytics: AnalyticsRepository
  users: UserRepository
  clock: Clock
}

export function makeGetAnalytics({ analytics, users, clock }: Dependencies) {
  return async function getAnalytics(
    ownerId: string,
    input?: { days?: number },
  ): Promise<AnalyticsView> {
    const requested = input?.days ?? DEFAULT_DAYS
    const days = Math.min(Math.max(Math.floor(requested), 1), MAX_DAYS)
    const owner = asEntityId(ownerId)

    const user = await users.findById(owner)
    const timeZone = user?.timezone ?? DEFAULT_TIME_ZONE

    const today = startOfCivilDay(clock.now(), timeZone)
    const from = new Date(today.getTime() - (days - 1) * DAY_MS)
    const toExclusive = new Date(today.getTime() + DAY_MS)

    const rows = await analytics.completionsByDay(
      owner,
      new Date(from.getTime() - DAY_MS),
      new Date(toExclusive.getTime() + DAY_MS),
      timeZone,
    )
    const counts = new Map(rows.map(row => [row.date, row.completed]))

    const series: { date: string; completed: number }[] = []
    for (let i = 0; i < days; i += 1) {
      const date = toIsoDate(new Date(from.getTime() + i * DAY_MS))
      series.push({ date, completed: counts.get(date) ?? 0 })
    }

    const totals = await analytics.totals(owner)
    const completionRate =
      totals.total > 0 ? totals.completed / totals.total : 0

    let currentStreak = 0
    for (let i = series.length - 1; i >= 0; i -= 1) {
      const day = series[i]
      if (day && day.completed > 0) {
        currentStreak += 1
      } else {
        break
      }
    }

    return {
      from: toIsoDate(from),
      to: toIsoDate(today),
      totalTasks: totals.total,
      totalCompleted: totals.completed,
      completionRate,
      currentStreak,
      days: series,
    }
  }
}
