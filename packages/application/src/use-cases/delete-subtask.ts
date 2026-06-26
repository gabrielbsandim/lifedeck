import { asEntityId } from '@lifedeck/domain'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  subtasks: SubtaskRepository
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
}

export function makeDeleteSubtask({
  subtasks,
  tasks,
  lists,
  memberships,
}: Dependencies) {
  return async function deleteSubtask(
    requesterId: string,
    subtaskId: string,
  ): Promise<void> {
    const subtask = await subtasks.findById(asEntityId(subtaskId))
    if (!subtask) {
      throw new NotFoundError('Subtask')
    }

    const task = await tasks.findById(subtask.toJSON().taskId)
    if (!task) {
      throw new NotFoundError('Subtask')
    }

    const list = await lists.findById(task.toJSON().listId)
    if (!list) {
      throw new NotFoundError('Subtask')
    }
    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('Subtask')
    }
    if (!access.canEdit) {
      throw new ForbiddenError('subtask')
    }

    await subtasks.delete(subtask.id)
  }
}
