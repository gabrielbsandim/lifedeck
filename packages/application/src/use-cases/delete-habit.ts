import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { HabitRepository } from '@/ports/habit-repository'

type Dependencies = {
  habits: HabitRepository
}

export function makeDeleteHabit({ habits }: Dependencies) {
  return async function deleteHabit(
    userId: string,
    habitId: string,
  ): Promise<void> {
    const habit = await habits.findById(asEntityId(habitId))
    if (!habit || !habit.isOwnedBy(asEntityId(userId))) {
      throw new NotFoundError('Habit')
    }
    // The habit's logs are removed by the database's cascade on the foreign key.
    await habits.delete(asEntityId(habitId))
  }
}
