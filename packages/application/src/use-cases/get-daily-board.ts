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

function isCarryable(task: Task): boolean {
  const props = task.toJSON()
  return (
    props.status === 'pending' &&
    props.recurringTaskId === null &&
    props.carriedForwardAt === null
  )
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

    const carryOver = await resolveCarryOver(list)

    const items = await materializeRecurring(list)
    const summaries = await summarizeSubtasks(
      subtasks,
      items.map(task => task.id),
    )
    return {
      list: toListView(list),
      tasks: items.map(task => toTaskView(task, summaries.get(task.id))),
      carryOver,
    }

    async function resolveCarryOver(
      todayList: List,
    ): Promise<CarryOverCandidate[]> {
      const isToday =
        referenceDate.getTime() ===
        startOfCivilDay(clock.now(), timezone).getTime()
      if (!isToday) {
        return []
      }
      if ((user?.carryOverMode ?? 'manual') === 'auto') {
        await unitOfWork.run(async () =>
          autoCarry(todayList, await collectCandidates()),
        )
        return []
      }
      const candidates = await collectCandidates()
      return candidates.map(candidate => ({
        task: toTaskView(candidate.task),
        fromDate: candidate.fromDate,
      }))
    }

    async function collectCandidates(): Promise<
      Array<{ task: Task; fromDate: string }>
    > {
      const priorDate = new Date(
        referenceDate.getTime() - CARRY_OVER_LOOKBACK_DAYS * MS_PER_DAY,
      )
      const priorList = await lists.findDailyByOwnerAndDate(owner, priorDate)
      if (!priorList) {
        return []
      }
      const fromDate = toIsoDate(priorDate)
      const priorTasks = await tasks.listByList(priorList.id)
      return priorTasks.filter(isCarryable).map(task => ({ task, fromDate }))
    }

    async function autoCarry(
      todayList: List,
      candidates: Array<{ task: Task; fromDate: string }>,
    ): Promise<void> {
      let position = (await tasks.listByList(todayList.id)).length
      for (const { task, fromDate } of candidates) {
        // A concurrent load may have carried this task already; only the
        // caller that flips carried_forward_at gets to copy it.
        if (!(await tasks.claimCarryForward(task.id, clock.now()))) {
          continue
        }
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
      return lists.ensureDaily(created)
    }

    // Returns the list's tasks. A poll with nothing to generate reuses the
    // read it already made and opens no transaction.
    async function materializeRecurring(dailyList: List): Promise<Task[]> {
      const [definitions, existing] = await Promise.all([
        recurringTasks.listByOwner(owner),
        tasks.listByList(dailyList.id),
      ])
      const alreadyGenerated = new Set(
        existing.map(task => task.toJSON().recurringTaskId),
      )
      const due = definitions.filter(
        definition =>
          !alreadyGenerated.has(definition.id) &&
          occursOn(definition.rule, referenceDate),
      )
      if (due.length === 0) {
        return existing
      }

      await unitOfWork.run(async () => {
        for (const definition of due) {
          await tasks.save(
            Task.create({
              id: ids.generate(),
              listId: dailyList.id,
              title: definition.title,
              createdAt: clock.now(),
              recurringTaskId: definition.id,
            }),
          )
        }
      })
      return tasks.listByList(dailyList.id)
    }
  }
}
