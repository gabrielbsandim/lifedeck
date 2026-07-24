import { HabitLog, ValidationError, asEntityId } from '@lifedeck/domain'
import { logHabitSchema, type HabitView } from '@/dtos/habit-dto'
import { buildHabitViews, habitToday } from '@/shared/habit-view'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { HabitRepository } from '@/ports/habit-repository'
import type { HabitLogRepository } from '@/ports/habit-log-repository'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  habits: HabitRepository
  habitLogs: HabitLogRepository
  users: Pick<UserRepository, 'findById'>
  ids: IdGenerator
  clock: Clock
}

export function makeLogHabit({
  habits,
  habitLogs,
  users,
  ids,
  clock,
}: Dependencies) {
  return async function logHabit(
    userId: string,
    habitId: string,
    input?: unknown,
  ): Promise<HabitView> {
    const { date, done } = logHabitSchema.parse(input ?? {})

    const habit = await habits.findById(asEntityId(habitId))
    if (!habit || !habit.isOwnedBy(asEntityId(userId))) {
      throw new NotFoundError('Habit')
    }

    const today = await habitToday(users, clock, userId)
    const targetDate = date ?? today
    // A habit can only be marked for a day that has happened. Backfilling a past
    // day is allowed (a forgotten check-in); a future day never is. Civil dates
    // are YYYY-MM-DD, so a lexical compare is a date compare.
    if (targetDate > today) {
      throw new ValidationError('Cannot log a habit for a future date.')
    }
    const markDone = done ?? true

    if (markDone) {
      // Idempotent: only create a mark when the day isn't already logged, so a
      // repeated "done today" doesn't error on the unique (habit, date).
      const existing = await habitLogs.findByHabitAndDate(
        asEntityId(habitId),
        targetDate,
      )
      if (!existing) {
        await habitLogs.save(
          HabitLog.create({
            id: ids.generate(),
            habitId: asEntityId(habitId),
            date: targetDate,
            createdAt: clock.now(),
          }),
        )
      }
    } else {
      await habitLogs.deleteByHabitAndDate(asEntityId(habitId), targetDate)
    }

    const [view] = await buildHabitViews([habit], habitLogs, today)
    return view!
  }
}
