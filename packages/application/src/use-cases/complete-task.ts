import { asEntityId } from '@taskin/domain'
import type { TaskView } from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { TaskRepository } from '@/ports/task-repository'

type Dependencies = {
  tasks: TaskRepository
  clock: Clock
}

export function makeCompleteTask({ tasks, clock }: Dependencies) {
  return async function completeTask(taskId: string): Promise<TaskView> {
    const task = await tasks.findById(asEntityId(taskId))
    if (!task) {
      throw new NotFoundError('Task')
    }

    task.complete(clock.now())
    await tasks.save(task)

    return toTaskView(task)
  }
}
