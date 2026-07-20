import { asEntityId } from '@lifedeck/domain'
import { type HabitView } from '@/dtos/habit-dto'
import { buildHabitViews, habitToday } from '@/shared/habit-view'
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

export function makeListHabits({
  habits,
  habitLogs,
  users,
  clock,
}: Dependencies) {
  return async function listHabits(userId: string): Promise<HabitView[]> {
    const owned = await habits.listByOwner(asEntityId(userId))
    const today = await habitToday(users, clock, userId)
    return buildHabitViews(owned, habitLogs, today)
  }
}
