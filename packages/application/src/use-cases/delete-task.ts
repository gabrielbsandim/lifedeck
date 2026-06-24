import { asEntityId } from '@lifedeck/domain'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeDeleteTask({ tasks, lists, memberships }: Dependencies) {
  return async function deleteTask(
    requesterId: string,
    taskId: string,
  ): Promise<void> {
    const task = await tasks.findById(asEntityId(taskId))
    if (!task) {
      throw new NotFoundError('Task')
    }

    const list = await lists.findById(task.toJSON().listId)
    if (!list) {
      throw new NotFoundError('Task')
    }
    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('Task')
    }
    if (!access.canEdit) {
      throw new ForbiddenError('task')
    }

    await tasks.delete(asEntityId(taskId))
  }
}
