import { asEntityId } from '@lifedeck/domain'
import { updateHabitSchema, type HabitView } from '@/dtos/habit-dto'
import { buildHabitViews, habitToday } from '@/shared/habit-view'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { HabitRepository } from '@/ports/habit-repository'
import type { HabitLogRepository } from '@/ports/habit-log-repository'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  habits: HabitRepository
  habitLogs: HabitLogRepository
  users: Pick<UserRepository, 'findById'>
  clock: Clock
}

export function makeUpdateHabit({
  habits,
  habitLogs,
  users,
  clock,
}: Dependencies) {
  return async function updateHabit(
    userId: string,
    habitId: string,
    input: unknown,
  ): Promise<HabitView> {
    const patch = updateHabitSchema.parse(input)

    const habit = await habits.findById(asEntityId(habitId))
    if (!habit || !habit.isOwnedBy(asEntityId(userId))) {
      throw new NotFoundError('Habit')
    }

    if (patch.title !== undefined) {
      habit.rename(patch.title)
    }
    if (patch.cadence !== undefined) {
      habit.changeCadence(patch.cadence)
    }
    if (patch.checkinHour !== undefined) {
      habit.setCheckinHour(patch.checkinHour)
    }
    if (patch.active !== undefined) {
      habit.setActive(patch.active)
    }
    await habits.save(habit)

    const today = await habitToday(users, clock, userId)
    const [view] = await buildHabitViews([habit], habitLogs, today)
    return view!
  }
}
