import { asEntityId } from '@taskin/domain'
import { type TaskView } from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { resolveListAccess } from '@/access/list-access'
import { NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeListListTasks({ tasks, lists, memberships }: Dependencies) {
  return async function listListTasks(
    requesterId: string | null,
    listId: string,
  ): Promise<TaskView[]> {
    const list = await lists.findById(asEntityId(listId))
    if (!list) {
      throw new NotFoundError('List')
    }

    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('List')
    }

    const isOwner =
      requesterId !== null && list.isOwnedBy(asEntityId(requesterId))
    const items = await tasks.listByList(asEntityId(listId))
    const visible = isOwner ? items : items.filter(task => !task.isPrivate)
    return visible.map(toTaskView)
  }
}
