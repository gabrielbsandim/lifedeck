import {
  List,
  Task,
  asEntityId,
  startOfCivilDay,
  DEFAULT_TIME_ZONE,
} from '@lifedeck/domain'
import { type TaskView } from '@/dtos/task-dto'
import { toTaskView } from '@/mappers/task-mapper'
import { NotFoundError, ForbiddenError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { UserRepository } from '@/ports/user-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

type Dependencies = {
  lists: ListRepository
  tasks: TaskRepository
  users: UserRepository
  ids: IdGenerator
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeBringTaskToToday({
  lists,
  tasks,
  users,
  ids,
  clock,
  unitOfWork,
}: Dependencies) {
  return async function bringTaskToToday(
    requesterId: string,
    taskId: string,
  ): Promise<TaskView> {
    const owner = asEntityId(requesterId)
    const task = await tasks.findById(asEntityId(taskId))
    if (!task) {
      throw new NotFoundError('Task')
    }

    const sourceList = await lists.findById(task.listId)
    if (!sourceList || !sourceList.isOwnedBy(owner)) {
      throw new NotFoundError('Task')
    }

    const sourceProps = sourceList.toJSON()
    const taskProps = task.toJSON()
    const user = await users.findById(owner)
    const today = startOfCivilDay(
      clock.now(),
      user?.timezone ?? DEFAULT_TIME_ZONE,
    )

    if (
      sourceProps.type !== 'daily' ||
      sourceProps.referenceDate === null ||
      sourceProps.referenceDate.getTime() >= today.getTime()
    ) {
      throw new ForbiddenError('Only past daily tasks can be brought forward.')
    }
    if (
      taskProps.status !== 'pending' ||
      taskProps.recurringTaskId !== null ||
      task.isCarriedForward
    ) {
      throw new ForbiddenError('This task cannot be brought forward.')
    }

    const copy = await unitOfWork.run(async () => {
      const todayList =
        (await lists.findDailyByOwnerAndDate(owner, today)) ??
        (await provisionToday())

      const position = (await tasks.listByList(todayList.id)).length
      const created = Task.create({
        id: ids.generate(),
        listId: todayList.id,
        title: taskProps.title,
        observation: taskProps.observation,
        carriedFromDate: sourceProps.referenceDate,
        position,
        createdAt: clock.now(),
      })

      task.markCarriedForward(clock.now())
      await tasks.save(task)
      await tasks.save(created)
      return created
    })

    return toTaskView(copy)

    async function provisionToday(): Promise<List> {
      const created = List.create({
        id: ids.generate(),
        ownerId: owner,
        title: today.toISOString().slice(0, 10),
        type: 'daily',
        visibility: 'private',
        referenceDate: today,
        createdAt: clock.now(),
      })
      await lists.save(created)
      return created
    }
  }
}
