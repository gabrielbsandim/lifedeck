import { areAllSubtasksCompleted, asEntityId } from '@lifedeck/domain'
import {
  updateSubtaskSchema,
  type UpdateSubtaskInput,
  type SubtaskView,
} from '@/dtos/subtask-dto'
import { toSubtaskView } from '@/mappers/subtask-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  subtasks: SubtaskRepository
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  clock: Clock
}

export function makeUpdateSubtask({
  subtasks,
  tasks,
  lists,
  memberships,
  clock,
}: Dependencies) {
  return async function updateSubtask(
    requesterId: string,
    subtaskId: string,
    input: UpdateSubtaskInput,
  ): Promise<SubtaskView> {
    const data = updateSubtaskSchema.parse(input)

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

    if (data.title !== undefined) {
      subtask.rename(data.title)
    }

    if (data.status !== undefined) {
      if (data.status === 'completed') {
        subtask.complete(clock.now())
      } else {
        subtask.reopen()
      }
    }

    await subtasks.save(subtask)

    if (data.status !== undefined) {
      const siblings = await subtasks.listByTask(task.id)
      const allDone = areAllSubtasksCompleted(siblings)
      if (allDone && !task.isCompleted) {
        task.complete(clock.now())
        await tasks.save(task)
      } else if (!allDone && task.isCompleted) {
        task.reopen()
        await tasks.save(task)
      }
    }

    return toSubtaskView(subtask)
  }
}
