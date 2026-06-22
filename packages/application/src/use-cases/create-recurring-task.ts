import { RecurringTask, asEntityId } from '@taskin/domain'
import {
  createRecurringTaskSchema,
  type CreateRecurringTaskInput,
  type RecurringTaskView,
} from '@/dtos/recurring-task-dto'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

type Dependencies = {
  recurringTasks: RecurringTaskRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateRecurringTask({
  recurringTasks,
  ids,
  clock,
}: Dependencies) {
  return async function createRecurringTask(
    ownerId: string,
    input: CreateRecurringTaskInput,
  ): Promise<RecurringTaskView> {
    const { title, rule } = createRecurringTaskSchema.parse(input)

    const definition = RecurringTask.create({
      id: ids.generate(),
      ownerId: asEntityId(ownerId),
      title,
      rule,
      createdAt: clock.now(),
    })

    await recurringTasks.save(definition)

    return toRecurringTaskView(definition)
  }
}
