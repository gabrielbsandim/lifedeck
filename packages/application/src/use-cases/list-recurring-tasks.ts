import { asEntityId } from '@lifedeck/domain'
import { type RecurringTaskView } from '@/dtos/recurring-task-dto'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

type Dependencies = {
  recurringTasks: RecurringTaskRepository
}

export function makeListRecurringTasks({ recurringTasks }: Dependencies) {
  return async function listRecurringTasks(
    ownerId: string,
  ): Promise<RecurringTaskView[]> {
    const owned = await recurringTasks.listByOwner(asEntityId(ownerId))
    return owned.map(toRecurringTaskView)
  }
}
