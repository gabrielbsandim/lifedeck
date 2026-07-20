import { Habit, asEntityId } from '@lifedeck/domain'
import {
  createHabitSchema,
  type CreateHabitInput,
  type HabitView,
} from '@/dtos/habit-dto'
import { toHabitView } from '@/mappers/habit-mapper'
import { habitToday } from '@/shared/habit-view'
import { ForbiddenError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { HabitRepository } from '@/ports/habit-repository'
import type { EntitlementService } from '@/ports/entitlement-service'
import type { UserRepository } from '@/ports/user-repository'

// The free plan gets a taste of habit tracking: a single habit. Paid plans are
// unlimited. Proactive check-ins are gated separately (proactiveMessaging).
const FREE_HABIT_LIMIT = 1

type Dependencies = {
  habits: HabitRepository
  users: Pick<UserRepository, 'findById'>
  entitlements: EntitlementService
  ids: IdGenerator
  clock: Clock
}

export function makeCreateHabit({
  habits,
  users,
  entitlements,
  ids,
  clock,
}: Dependencies) {
  return async function createHabit(
    userId: string,
    input: CreateHabitInput,
  ): Promise<HabitView> {
    const { title, cadence, checkinHour } = createHabitSchema.parse(input)

    const { plan } = await entitlements.for(userId)
    if (plan === 'free') {
      const owned = await habits.countByOwner(asEntityId(userId))
      if (owned >= FREE_HABIT_LIMIT) {
        throw new ForbiddenError('habit')
      }
    }

    const habit = Habit.create({
      id: ids.generate(),
      ownerId: asEntityId(userId),
      title,
      cadence,
      checkinHour: checkinHour ?? null,
      createdAt: clock.now(),
    })
    await habits.save(habit)

    // A brand-new habit has no logs, so its view starts at a zero streak.
    const today = await habitToday(users, clock, userId)
    return toHabitView(habit, [], today)
  }
}
