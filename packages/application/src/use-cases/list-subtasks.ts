import { asEntityId } from '@lifedeck/domain'
import { type SubtaskView } from '@/dtos/subtask-dto'
import { toSubtaskView } from '@/mappers/subtask-mapper'
import { resolveListAccess } from '@/access/list-access'
import { NotFoundError } from '@/errors/use-case-error'
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

export function makeListSubtasks({
  subtasks,
  tasks,
  lists,
  memberships,
}: Dependencies) {
  return async function listSubtasks(
    requesterId: string,
    taskId: string,
  ): Promise<SubtaskView[]> {
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

    const items = await subtasks.listByTask(task.id)
    return items.map(toSubtaskView)
  }
}
