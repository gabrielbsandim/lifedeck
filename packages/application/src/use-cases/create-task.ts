import { Task, asEntityId } from '@taskin/domain'
import {
  createTaskSchema,
  type CreateTaskInput,
  type TaskView,
} from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateTask({ tasks, ids, clock }: Dependencies) {
  return async function createTask(input: CreateTaskInput): Promise<TaskView> {
    const { listId, title } = createTaskSchema.parse(input)

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
