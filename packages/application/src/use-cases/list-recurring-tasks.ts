import { asEntityId } from '@lifedeck/domain'
import { type RecurringTaskView } from '@/dtos/recurring-task-dto'
import { toRecurringTaskView } from '@/mappers/recurring-task-mapper'
import type { Page, PageParams } from '@/pagination'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'

type Dependencies = {
  recurringTasks: RecurringTaskRepository
}

export function makeListRecurringTasks({ recurringTasks }: Dependencies) {
  return async function listRecurringTasks(
    ownerId: string,
    params: PageParams,
  ): Promise<Page<RecurringTaskView>> {
    const page = await recurringTasks.pageByOwner(asEntityId(ownerId), params)
    return {
      items: page.items.map(toRecurringTaskView),
      nextCursor: page.nextCursor,
    }
  }
}
