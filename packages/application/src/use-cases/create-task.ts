import { Task, asEntityId } from '@taskin/domain'
import {
  createTaskSchema,
  type CreateTaskInput,
  type TaskView,
} from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { canEditList, canReadList } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateTask({ tasks, lists, ids, clock }: Dependencies) {
  return async function createTask(
    requesterId: string,
    input: CreateTaskInput,
  ): Promise<TaskView> {
    const { listId, title } = createTaskSchema.parse(input)

    const list = await lists.findById(asEntityId(listId))
    if (!list || !canReadList(list, requesterId)) {
      throw new NotFoundError('List')
    }
    if (!canEditList(list, requesterId)) {
      throw new ForbiddenError('list')
    }

    const task = Task.create({
      id: ids.generate(),
      listId: asEntityId(listId),
      title,
      createdAt: clock.now(),
    })

    await tasks.save(task)

    return toTaskView(task)
  }
}
