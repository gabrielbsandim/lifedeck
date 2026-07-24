import {
  asEntityId,
  civilDate,
  computeHabitStreak,
  expectedHabitCompletions,
  startOfCivilDay,
  DEFAULT_TIME_ZONE,
} from '@lifedeck/domain'
import { type AnalyticsView } from '@/dtos/analytics-dto'
import type { AnalyticsRepository } from '@/ports/analytics-repository'
import type { Clock } from '@/ports/clock'
import type { HabitRepository } from '@/ports/habit-repository'
import type { HabitLogRepository } from '@/ports/habit-log-repository'
import type { UserRepository } from '@/ports/user-repository'

const DEFAULT_DAYS = 30
const MAX_DAYS = 3660
const DAY_MS = 86_400_000
// A streak can reach this far back, so habit logs are loaded at least this wide
// even when the analytics window is short, to compute the current streak.
const STREAK_WINDOW_DAYS = 400

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

type Dependencies = {
  analytics: AnalyticsRepository
  habits: HabitRepository
  habitLogs: HabitLogRepository
  users: UserRepository
  clock: Clock
}

export function makeGetAnalytics({
  analytics,
  habits,
  habitLogs,
  users,
  clock,
}: Dependencies) {
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
    const byDate = new Map(rows.map(row => [row.date, row]))

    const series: { date: string; total: number; completed: number }[] = []
    for (let i = 0; i < days; i += 1) {
      const date = toIsoDate(new Date(from.getTime() + i * DAY_MS))
      const row = byDate.get(date)
      series.push({
        date,
        total: row?.total ?? 0,
        completed: row?.completed ?? 0,
      })
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

    const fromDate = toIsoDate(from)
    const toDate = toIsoDate(today)

    // Habit analytics share the task window. Logs are loaded over the wider of
    // the analytics window and the streak window, so the current streak is right
    // even for a 7-day view, while completions/expected count only the window.
    const active = (await habits.listByOwner(owner)).filter(
      habit => habit.active,
    )
    const streakStart = toIsoDate(
      new Date(today.getTime() - STREAK_WINDOW_DAYS * DAY_MS),
    )
    const since = fromDate < streakStart ? fromDate : streakStart
    const logs = active.length
      ? await habitLogs.listByHabitsSince(
          active.map(habit => habit.id),
          since,
        )
      : []
    const datesByHabit = new Map<string, string[]>()
    for (const log of logs) {
      const dates = datesByHabit.get(log.habitId) ?? []
      dates.push(log.date)
      datesByHabit.set(log.habitId, dates)
    }
    const items = active
      .map(habit => {
        const dates = datesByHabit.get(habit.id) ?? []
        const completions = dates.filter(
          date => date >= fromDate && date <= toDate,
        ).length
        const createdCivil = civilDate(habit.toJSON().createdAt, timeZone)
        const effectiveFrom = createdCivil > fromDate ? createdCivil : fromDate
        return {
          id: habit.id as string,
          title: habit.title,
          currentStreak: computeHabitStreak(habit.cadence, dates, toDate),
          completions,
          expected: expectedHabitCompletions(
            habit.cadence,
            effectiveFrom,
            toDate,
          ),
        }
      })
      .sort(
        (a, b) =>
          b.currentStreak - a.currentStreak || b.completions - a.completions,
      )
    const habitCompletions = items.reduce((sum, it) => sum + it.completions, 0)
    const bestStreak = items.reduce(
      (max, it) => Math.max(max, it.currentStreak),
      0,
    )
    const totalExpected = items.reduce((sum, it) => sum + it.expected, 0)
    const totalDone = items.reduce(
      (sum, it) => sum + Math.min(it.completions, it.expected),
      0,
    )
    const consistency = totalExpected > 0 ? totalDone / totalExpected : 0

    return {
      from: fromDate,
      to: toDate,
      totalTasks: totals.total,
      totalCompleted: totals.completed,
      completionRate,
      currentStreak,
      days: series,
      habits: {
        active: active.length,
        completions: habitCompletions,
        bestStreak,
        consistency,
        items,
      },
    }
  }
}
