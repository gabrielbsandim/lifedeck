import { DEFAULT_TIME_ZONE, asEntityId, civilDate } from '@lifedeck/domain'
import type { Habit } from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { HabitLogRepository } from '@/ports/habit-log-repository'
import type { UserRepository } from '@/ports/user-repository'
import { toHabitView } from '@/mappers/habit-mapper'
import type { HabitView } from '@/dtos/habit-dto'

const DAY_MS = 86_400_000
// How far back a streak reads. Longer streaks clamp to this window, which keeps
// the log query bounded; a year-plus is well past any real habit run.
const STREAK_WINDOW_DAYS = 400

// The civil date `days` before `today`, so the log query only pulls the streak
// window instead of a habit's whole history.
function windowStart(today: string, days: number): string {
  const start = new Date(`${today}T00:00:00.000Z`).getTime() - days * DAY_MS
  return new Date(start).toISOString().slice(0, 10)
}

// The owner's civil "today", the anchor every streak and doneToday is measured
// against. Falls back to UTC when the user record is somehow missing.
export async function habitToday(
  users: Pick<UserRepository, 'findById'>,
  clock: Clock,
  userId: string,
): Promise<string> {
  const user = await users.findById(asEntityId(userId))
  return civilDate(clock.now(), user?.timezone ?? DEFAULT_TIME_ZONE)
}

// Builds views for a set of habits, loading their completion dates in a single
// windowed query and grouping them per habit.
export async function buildHabitViews(
  habits: Habit[],
  habitLogs: HabitLogRepository,
  today: string,
): Promise<HabitView[]> {
  if (habits.length === 0) {
    return []
  }
  const logs = await habitLogs.listByHabitsSince(
    habits.map(habit => habit.id),
    windowStart(today, STREAK_WINDOW_DAYS),
  )
  const datesByHabit = new Map<string, string[]>()
  for (const log of logs) {
    const dates = datesByHabit.get(log.habitId) ?? []
    dates.push(log.date)
    datesByHabit.set(log.habitId, dates)
  }
  return habits.map(habit =>
    toHabitView(habit, datesByHabit.get(habit.id) ?? [], today),
  )
}
