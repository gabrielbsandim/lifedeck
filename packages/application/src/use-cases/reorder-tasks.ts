import { asEntityId } from '@lifedeck/domain'
import { reorderTasksSchema, type TaskView } from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { resolveListAccess } from '@/access/list-access'
import { ForbiddenError, NotFoundError } from '@/errors/use-case-error'
import type { ListRepository } from '@/ports/list-repository'
import type { MembershipRepository } from '@/ports/membership-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  tasks: TaskRepository
  lists: ListRepository
  memberships: MembershipRepository
  unitOfWork: UnitOfWork
}

export function makeReorderTasks({
  tasks,
  lists,
  memberships,
  unitOfWork,
}: Dependencies) {
  return async function reorderTasks(
    requesterId: string,
    listId: string,
    input: unknown,
  ): Promise<TaskView[]> {
    const { taskIds } = reorderTasksSchema.parse(input)

    const list = await lists.findById(asEntityId(listId))
    if (!list) {
      throw new NotFoundError('List')
    }
    const access = await resolveListAccess(list, requesterId, memberships)
    if (!access.canRead) {
      throw new NotFoundError('List')
    }
    if (!access.canEdit) {
      throw new ForbiddenError('list')
    }

    const current = await tasks.listByList(asEntityId(listId))
    const byId = new Map(current.map(task => [task.id as string, task]))

    await unitOfWork.run(async () => {
      let index = 0
      for (const id of taskIds) {
        const task = byId.get(id)
        if (!task) {
          continue
        }
        task.setPosition(index)
        await tasks.save(task)
        index += 1
      }
    })

    const reordered = await tasks.listByList(asEntityId(listId))
    return reordered.map(toTaskView)
  }
}
