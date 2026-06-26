import { Subtask, asEntityId } from '@lifedeck/domain'
import {
  createSubtaskSchema,
  type CreateSubtaskInput,
  type SubtaskView,
} from '@/dtos/subtask-dto'
import { toSubtaskView } from '@/mappers/subtask-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  subtasks: SubtaskRepository
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateSubtask({
  subtasks,
  tasks,
  lists,
  memberships,
  ids,
  clock,
}: Dependencies) {
  return async function createSubtask(
    requesterId: string,
    taskId: string,
    input: CreateSubtaskInput,
  ): Promise<SubtaskView> {
    const { title } = createSubtaskSchema.parse(input)

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

    const existing = await subtasks.listByTask(task.id)

    const subtask = Subtask.create({
      id: ids.generate(),
      taskId: task.id,
      title,
      position: existing.length,
      createdAt: clock.now(),
    })

    await subtasks.save(subtask)

    if (task.isCompleted) {
      task.reopen()
      await tasks.save(task)
    }

    return toSubtaskView(subtask)
  }
}
