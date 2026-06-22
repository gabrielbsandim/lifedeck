import { asEntityId } from '@taskin/domain'
import { type TaskView } from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { canReadList } from '@/access/list-access'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
}

export function makeListListTasks({ tasks, lists }: Dependencies) {
  return async function listListTasks(
    requesterId: string | null,
    listId: string,
  ): Promise<TaskView[]> {
    const list = await lists.findById(asEntityId(listId))
    if (!list || !canReadList(list, requesterId)) {
      throw new NotFoundError('List')
    }

    const items = await tasks.listByList(asEntityId(listId))
    return items.map(toTaskView)
  }
}
