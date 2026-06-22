import { asEntityId } from '@taskin/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

type Dependencies = {
  recurringTasks: RecurringTaskRepository
}

export function makeDeleteRecurringTask({ recurringTasks }: Dependencies) {
  return async function deleteRecurringTask(
    ownerId: string,
    id: string,
  ): Promise<void> {
    const definition = await recurringTasks.findById(asEntityId(id))
    if (!definition || !definition.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Recurring task')
    }

    await recurringTasks.delete(asEntityId(id))
  }
}
