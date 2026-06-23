import { List, Task, asEntityId, occursOn } from '@lifedeck/domain'
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
import type { UserRepository } from '@/ports/user-repository'

const dateSchema = z.string().date()

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export type CarryOverCandidate = {
  task: TaskView
  fromDate: string
}

export type DailyBoardView = {
  list: ListView
  tasks: TaskView[]
  carryOver: CarryOverCandidate[]
}

type Dependencies = {
  lists: ListRepository
  tasks: TaskRepository
  recurringTasks: RecurringTaskRepository
  users: UserRepository
  ids: IdGenerator
  clock: Clock
}

export function makeGetDailyBoard({
  lists,
  tasks,
  recurringTasks,
  users,
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

    let carryOver: CarryOverCandidate[] = []
    if (referenceDate.getTime() === startOfUtcDay(clock.now()).getTime()) {
      const user = await users.findById(owner)
      const candidates = await collectCandidates()
      if ((user?.carryOverMode ?? 'manual') === 'auto') {
        await autoCarry(list, candidates)
      } else {
        carryOver = candidates.map(candidate => ({
          task: toTaskView(candidate.task),
          fromDate: candidate.fromDate,
        }))
      }
    }

    await materializeRecurring(list)

    const items = await tasks.listByList(list.id)
    return {
      list: toListView(list),
      tasks: items.map(toTaskView),
      carryOver,
    }

    async function collectCandidates(): Promise<
      Array<{ task: Task; fromDate: string }>
    > {
      const owned = await lists.listByOwner(owner)
      const priorDailyLists = owned.filter(candidate => {
        const props = candidate.toJSON()
        return (
          props.type === 'daily' &&
          props.referenceDate !== null &&
          props.referenceDate.getTime() < referenceDate.getTime()
        )
      })

      const result: Array<{ task: Task; fromDate: string }> = []
      for (const priorList of priorDailyLists) {
        const fromDate = toIsoDate(priorList.toJSON().referenceDate as Date)
        const priorTasks = await tasks.listByList(priorList.id)
        for (const task of priorTasks) {
          const props = task.toJSON()
          if (
            props.status === 'pending' &&
            props.recurringTaskId === null &&
            props.carriedForwardAt === null
          ) {
            result.push({ task, fromDate })
          }
        }
      }
      return result
    }

    async function autoCarry(
      todayList: List,
      candidates: Array<{ task: Task; fromDate: string }>,
    ): Promise<void> {
      let position = (await tasks.listByList(todayList.id)).length
      for (const { task, fromDate } of candidates) {
        const props = task.toJSON()
        const copy = Task.create({
          id: ids.generate(),
          listId: todayList.id,
          title: props.title,
          observation: props.observation,
          carriedFromDate: new Date(`${fromDate}T00:00:00.000Z`),
          position,
          createdAt: clock.now(),
        })
        position += 1
        task.markCarriedForward(clock.now())
        await tasks.save(task)
        await tasks.save(copy)
      }
    }

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
