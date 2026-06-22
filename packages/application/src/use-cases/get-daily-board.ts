import { List, Task, asEntityId, occursOn } from '@taskin/domain'
import { z } from 'zod'
import { type ListView } from '@/dtos/list-dto'
import { type TaskView } from '@/dtos/task-dto'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'
import type { TaskRepository } from '@/ports/task-repository'

const dateSchema = z.string().date()

export type DailyBoardView = {
  list: ListView
  tasks: TaskView[]
}

type Dependencies = {
  lists: ListRepository
  tasks: TaskRepository
  recurringTasks: RecurringTaskRepository
  ids: IdGenerator
  clock: Clock
}

export function makeGetDailyBoard({
  lists,
  tasks,
  recurringTasks,
  ids,
  clock,
}: Dependencies) {
  return async function getDailyBoard(
    ownerId: string,
    date: string,
  ): Promise<DailyBoardView> {
    const day = dateSchema.parse(date)
    const owner = asEntityId(ownerId)
    const referenceDate = new Date(`${day}T00:00:00.000Z`)

    const list =
      (await lists.findDailyByOwnerAndDate(owner, referenceDate)) ??
      (await provisionDailyList())

    await materializeRecurring(list)

    const items = await tasks.listByList(list.id)
    return { list: toListView(list), tasks: items.map(toTaskView) }

    async function provisionDailyList(): Promise<List> {
      const created = List.create({
        id: ids.generate(),
        ownerId: owner,
        title: day,
        type: 'daily',
        visibility: 'private',
        referenceDate,
        createdAt: clock.now(),
      })
      await lists.save(created)
      return created
    }

    async function materializeRecurring(dailyList: List): Promise<void> {
      const definitions = await recurringTasks.listByOwner(owner)
      if (definitions.length === 0) {
        return
      }

      const existing = await tasks.listByList(dailyList.id)
      const alreadyGenerated = new Set(
        existing
          .map(task => task.toJSON().recurringTaskId)
          .filter((id): id is NonNullable<typeof id> => id !== null),
      )

      for (const definition of definitions) {
        if (alreadyGenerated.has(definition.id)) {
          continue
        }
        if (!occursOn(definition.rule, referenceDate)) {
          continue
        }
        const task = Task.create({
          id: ids.generate(),
          listId: dailyList.id,
          title: definition.title,
          createdAt: clock.now(),
          recurringTaskId: definition.id,
        })
        await tasks.save(task)
      }
    }
  }
}
