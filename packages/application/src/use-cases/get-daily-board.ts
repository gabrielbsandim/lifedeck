import {
  List,
  Subtask,
  Task,
  asEntityId,
  occursOn,
  startOfCivilDay,
  DEFAULT_TIME_ZONE,
} from '@lifedeck/domain'
import { z } from 'zod'
import { type ListView } from '@/dtos/list-dto'
import { type TaskView } from '@/dtos/task-dto'
import { toListView } from '@/mappers/list-mapper'
import { toTaskView } from '@/mappers/task-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { ListRepository } from '@/ports/list-repository'
import type { RecurringTaskRepository } from '@/ports/recurring-task-repository'
import type { SubtaskRepository } from '@/ports/subtask-repository'
import type { TaskRepository } from '@/ports/task-repository'
import type { UserRepository } from '@/ports/user-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'
import { summarizeSubtasks } from '@/mappers/subtask-summary'

const dateSchema = z.string().date()

const MS_PER_DAY = 24 * 60 * 60 * 1000

// The "yesterday's leftovers" nudge only looks one day back, so it surfaces
// genuinely-recent unfinished tasks and never a pile from days you skipped.
// Older pending tasks stay on their own day (reachable by navigating back, or
// carried automatically when carry-over mode is 'auto').
const CARRY_OVER_LOOKBACK_DAYS = 1

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
  subtasks: SubtaskRepository
  recurringTasks: RecurringTaskRepository
  users: UserRepository
  ids: IdGenerator
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeGetDailyBoard({
  lists,
  tasks,
  subtasks,
  recurringTasks,
  users,
  ids,
  clock,
  unitOfWork,
}: Dependencies) {
  return async function getDailyBoard(
    ownerId: string,
    date: string,
  ): Promise<DailyBoardView> {
    const day = dateSchema.parse(date)
    const owner = asEntityId(ownerId)
    const referenceDate = new Date(`${day}T00:00:00.000Z`)

    const user = await users.findById(owner)
    const timezone = user?.timezone ?? DEFAULT_TIME_ZONE

    const list =
      (await lists.findDailyByOwnerAndDate(owner, referenceDate)) ??
      (await provisionDailyList())

    let carryOver: CarryOverCandidate[] = []
    if (
      referenceDate.getTime() ===
      startOfCivilDay(clock.now(), timezone).getTime()
    ) {
      const candidates = await collectCandidates()
      if ((user?.carryOverMode ?? 'manual') === 'auto') {
        await unitOfWork.run(() => autoCarry(list, candidates))
      } else {
        carryOver = candidates.map(candidate => ({
          task: toTaskView(candidate.task),
          fromDate: candidate.fromDate,
        }))
      }
    }

    await unitOfWork.run(() => materializeRecurring(list))

    const items = await tasks.listByList(list.id)
    const summaries = await summarizeSubtasks(
      subtasks,
      items.map(task => task.id),
    )
    return {
      list: toListView(list),
      tasks: items.map(task => toTaskView(task, summaries.get(task.id))),
      carryOver,
    }

    async function collectCandidates(): Promise<
      Array<{ task: Task; fromDate: string }>
    > {
      const owned = await lists.listByOwner(owner)
      const earliest =
        referenceDate.getTime() - CARRY_OVER_LOOKBACK_DAYS * MS_PER_DAY
      const priorDailyLists = owned.filter(candidate => {
        const props = candidate.toJSON()
        return (
          props.type === 'daily' &&
          props.referenceDate !== null &&
          props.referenceDate.getTime() < referenceDate.getTime() &&
          props.referenceDate.getTime() >= earliest
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
        await copySubtasks(task.id, copy.id)
      }
    }

    async function copySubtasks(
      fromTaskId: Task['id'],
      toTaskId: Task['id'],
    ): Promise<void> {
      const originals = await subtasks.listByTask(fromTaskId)
      for (const original of originals) {
        const props = original.toJSON()
        const copy = Subtask.create({
          id: ids.generate(),
          taskId: toTaskId,
          title: props.title,
          position: props.position,
          createdAt: clock.now(),
        })
        if (props.status === 'completed') {
          copy.complete(props.completedAt ?? clock.now())
        }
        await subtasks.save(copy)
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
