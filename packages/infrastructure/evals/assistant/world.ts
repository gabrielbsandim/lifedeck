import { randomUUID } from 'node:crypto'
import { User, asEntityId, type EntityId } from '@lifedeck/domain'
import {
  FakeEmailSender,
  InMemoryCalendarEventRepository,
  InMemoryHabitLogRepository,
  InMemoryHabitRepository,
  InMemoryListRepository,
  InMemoryMembershipRepository,
  InMemoryNotificationRepository,
  InMemoryRecurringTaskRepository,
  InMemorySubtaskRepository,
  InMemoryTaskRepository,
  InMemoryUserRepository,
  makeAssistantTools,
  makeBringTaskToToday,
  makeCreateCalendarEvent,
  makeCreateHabit,
  makeCreateList,
  makeCreateSubtask,
  makeCreateTask,
  makeDeleteCalendarEvent,
  makeDeleteCalendarOccurrence,
  makeDeleteTask,
  makeFindFreeSlots,
  makeGetDailyBoard,
  makeListCalendarEvents,
  makeListHabits,
  makeListListTasks,
  makeListUserLists,
  makeLogHabit,
  makePublishNotification,
  makeSetAssistantProfile,
  makeUpdateCalendarEvent,
  makeUpdateCalendarOccurrence,
  makeUpdateSubtask,
  makeUpdateTask,
  type AssistantTools,
  type BookingAssistantTools,
} from '@lifedeck/application'

export const TIMEZONE = 'America/Sao_Paulo'
// Thursday 2026-11-26, 12:00 in São Paulo. Fixed so every model sees the same day.
export const NOW = new Date('2026-11-26T15:00:00.000Z')
export const TODAY = '2026-11-26'
export const YESTERDAY = '2026-11-25'
export const TOMORROW = '2026-11-27'

const silent = { error: () => {}, warn: () => {}, info: () => {} }

const notImplemented = new Proxy({} as BookingAssistantTools, {
  get: (_, name) => async () => {
    throw new Error(`booking tool ${String(name)} is not part of the eval`)
  },
})

/** One user's in-memory Life Deck, wired with the production use cases. */
export async function createWorld() {
  const clock = { now: () => NOW }
  const ids = { generate: () => asEntityId(randomUUID()) }
  const unitOfWork = { run: <T>(work: () => Promise<T>) => work() }
  const userId = randomUUID()

  const users = new InMemoryUserRepository()
  const lists = new InMemoryListRepository()
  const tasks = new InMemoryTaskRepository()
  const subtasks = new InMemorySubtaskRepository()
  const recurringTasks = new InMemoryRecurringTaskRepository()
  const memberships = new InMemoryMembershipRepository()
  const calendarEvents = new InMemoryCalendarEventRepository()
  const habits = new InMemoryHabitRepository()
  const habitLogs = new InMemoryHabitLogRepository()
  const jobQueue = { enqueue: async () => {} }
  const publishNotification = makePublishNotification({
    notifications: new InMemoryNotificationRepository(),
    logger: silent,
  })
  const entitlements = {
    for: async () => ({ plan: 'premium' as const, entitlements: [] }),
  }

  await users.save(
    User.createGuest({
      id: asEntityId(userId),
      displayName: 'Gabriel',
      locale: 'pt',
      timezone: TIMEZONE,
      createdAt: new Date('2026-08-01T12:00:00.000Z'),
    }),
  )

  const getDailyBoard = makeGetDailyBoard({
    lists,
    tasks,
    subtasks,
    recurringTasks,
    users,
    ids,
    clock,
    unitOfWork,
  })
  const listCalendarEvents = makeListCalendarEvents({ calendarEvents, users })
  const listHabits = makeListHabits({ habits, habitLogs, users, clock })

  const real: AssistantTools = makeAssistantTools({
    users,
    clock,
    weather: {
      getForecast: async () => ({ ok: false, reason: 'unavailable' }),
      resolveLocation: async () => ({ ok: false, reason: 'unavailable' }),
    },
    getDailyBoard,
    listUserLists: makeListUserLists({ lists, memberships }),
    listListTasks: makeListListTasks({ tasks, subtasks, lists, memberships }),
    listCalendarEvents,
    findFreeSlots: makeFindFreeSlots({ users, listCalendarEvents, clock }),
    createTask: makeCreateTask({ tasks, lists, memberships, ids, clock }),
    updateTask: makeUpdateTask({
      tasks,
      lists,
      memberships,
      users,
      publishNotification,
      emailSender: new FakeEmailSender(),
      ids,
      clock,
    }),
    deleteTask: makeDeleteTask({ tasks, lists, memberships }),
    bringTaskToToday: makeBringTaskToToday({
      subtasks,
      lists,
      tasks,
      users,
      ids,
      clock,
      unitOfWork,
    }),
    createList: makeCreateList({ lists, ids, clock }),
    createSubtask: makeCreateSubtask({
      subtasks,
      tasks,
      lists,
      memberships,
      ids,
      clock,
    }),
    updateSubtask: makeUpdateSubtask({
      subtasks,
      tasks,
      lists,
      memberships,
      clock,
    }),
    createCalendarEvent: makeCreateCalendarEvent({
      calendarEvents,
      users,
      jobQueue,
      ids,
      clock,
    }),
    updateCalendarEvent: makeUpdateCalendarEvent({
      calendarEvents,
      users,
      jobQueue,
      clock,
    }),
    updateCalendarOccurrence: makeUpdateCalendarOccurrence({
      calendarEvents,
      jobQueue,
      ids,
      clock,
    }),
    deleteCalendarOccurrence: makeDeleteCalendarOccurrence({
      calendarEvents,
      jobQueue,
      ids,
      clock,
    }),
    deleteCalendarEvent: makeDeleteCalendarEvent({
      calendarEvents,
      jobQueue,
      clock,
    }),
    setAssistantProfile: makeSetAssistantProfile({ users }),
    createHabit: makeCreateHabit({ habits, users, entitlements, ids, clock }),
    listHabits,
    logHabit: makeLogHabit({ habits, habitLogs, users, ids, clock }),
    booking: notImplemented,
  })

  const habitDoneOn = async (habitId: string, date: string) =>
    (await habitLogs.findByHabitAndDate(habitId as EntityId, date)) !== null

  // A tool that throws reaches the model as an error it can only apologize for,
  // so the failures are kept to tell a harness bug from a model mistake.
  const toolErrors: string[] = []
  const tools = new Proxy(real, {
    get: (target, name: keyof AssistantTools) => {
      const method = target[name] as (...args: unknown[]) => Promise<unknown>
      return async (...args: unknown[]) =>
        method(...args).catch((error: unknown) => {
          toolErrors.push(
            `${String(name)}(${JSON.stringify(args.slice(1))}): ${error instanceof Error ? error.message : String(error)}`,
          )
          throw error
        })
    },
  })

  return {
    userId,
    tools,
    toolErrors,
    today: async () => (await tools.getToday(userId)).tasks,
    habits: async () => (await tools.getHabits(userId)).habits,
    habitDoneOn,
    events: async () => calendarEvents.listByOwner(asEntityId(userId)),
    memory: async () => (await tools.getContext(userId)).memory,
  }
}

export type World = Awaited<ReturnType<typeof createWorld>>
