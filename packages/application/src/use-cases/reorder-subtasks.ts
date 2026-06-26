import { asEntityId } from '@lifedeck/domain'
import { reorderSubtasksSchema, type SubtaskView } from '@/dtos/subtask-dto'
import { toSubtaskView } from '@/mappers/subtask-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  subtasks: SubtaskRepository
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  unitOfWork: UnitOfWork
}

export function makeReorderSubtasks({
  subtasks,
  tasks,
  lists,
  memberships,
  unitOfWork,
}: Dependencies) {
  return async function reorderSubtasks(
    requesterId: string,
    taskId: string,
    input: unknown,
  ): Promise<SubtaskView[]> {
    const { subtaskIds } = reorderSubtasksSchema.parse(input)

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

    const current = await subtasks.listByTask(task.id)
    const byId = new Map(
      current.map(subtask => [subtask.id as string, subtask]),
    )

    await unitOfWork.run(async () => {
      let index = 0
      for (const id of subtaskIds) {
        const subtask = byId.get(id)
        if (!subtask) {
          continue
        }
        subtask.setPosition(index)
        await subtasks.save(subtask)
        index += 1
      }
    })

    const reordered = await subtasks.listByTask(task.id)
    return reordered.map(toSubtaskView)
  }
}
