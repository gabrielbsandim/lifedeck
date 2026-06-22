import { asEntityId } from '@taskin/domain'
import {
  updateTaskSchema,
  type UpdateTaskInput,
  type TaskView,
} from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  clock: Clock
}

export function makeUpdateTask({
  tasks,
  lists,
  memberships,
  clock,
}: Dependencies) {
  return async function updateTask(
    requesterId: string,
    taskId: string,
    input: UpdateTaskInput,
  ): Promise<TaskView> {
    const data = updateTaskSchema.parse(input)

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

    if (data.title !== undefined) {
      task.rename(data.title)
    }
    if (data.observation !== undefined) {
      task.setObservation(data.observation)
    }
    if (data.status === 'completed') {
      task.complete(clock.now())
    }
    if (data.status === 'pending') {
      task.reopen()
    }

    await tasks.save(task)

    return toTaskView(task)
  }
}
