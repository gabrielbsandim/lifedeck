import { asEntityId } from '@taskin/domain'
import {
  updateRecurringTaskSchema,
  type UpdateRecurringTaskInput,
  type RecurringTaskView,
} from '@/dtos/recurring-task-dto'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

type Dependencies = {
  recurringTasks: RecurringTaskRepository
}

export function makeUpdateRecurringTask({ recurringTasks }: Dependencies) {
  return async function updateRecurringTask(
    ownerId: string,
    id: string,
    input: UpdateRecurringTaskInput,
  ): Promise<RecurringTaskView> {
    const data = updateRecurringTaskSchema.parse(input)

    const definition = await recurringTasks.findById(asEntityId(id))
    if (!definition || !definition.isOwnedBy(asEntityId(ownerId))) {
      throw new NotFoundError('Recurring task')
    }

    if (data.title !== undefined) {
      definition.rename(data.title)
    }
    if (data.rule !== undefined) {
      definition.changeRule(data.rule)
    }

    await recurringTasks.save(definition)

    return toRecurringTaskView(definition)
  }
}
