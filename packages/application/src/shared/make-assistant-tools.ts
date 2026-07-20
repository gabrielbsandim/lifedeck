import {
  DEFAULT_TIME_ZONE,
  asEntityId,
  civilDate,
  summarizeAssistantProfile,
  zonedIso,
  zonedWeekday,
} from '@lifedeck/domain'
import type { Clock } from '@/ports/clock'
import type { UserRepository } from '@/ports/user-repository'
import type { WeatherProvider } from '@/ports/weather-provider'
import type { AssistantTools } from '@/ports/assistant-tools'
import { NotFoundError } from '@/errors/use-case-error'
import type { makeGetDailyBoard } from '@/use-cases/get-daily-board'
import type { makeListUserLists } from '@/use-cases/list-user-lists'
import type { makeListCalendarEvents } from '@/use-cases/list-calendar-events'
import type { makeCreateTask } from '@/use-cases/create-task'
import type { makeUpdateTask } from '@/use-cases/update-task'
import type { makeDeleteTask } from '@/use-cases/delete-task'
import type { makeBringTaskToToday } from '@/use-cases/bring-task-to-today'
import type { makeCreateList } from '@/use-cases/create-list'
import type { makeCreateSubtask } from '@/use-cases/create-subtask'
import type { makeUpdateSubtask } from '@/use-cases/update-subtask'
import type { makeCreateCalendarEvent } from '@/use-cases/create-calendar-event'
import type { makeUpdateCalendarEvent } from '@/use-cases/update-calendar-event'
import type { makeUpdateCalendarOccurrence } from '@/use-cases/update-calendar-occurrence'
import type { makeDeleteCalendarOccurrence } from '@/use-cases/delete-calendar-occurrence'
import type { makeDeleteCalendarEvent } from '@/use-cases/delete-calendar-event'
import type { makeSetWeatherLocation } from '@/use-cases/set-weather-location'
import type { makeSetAssistantProfile } from '@/use-cases/set-assistant-profile'
import type { makeCreateHabit } from '@/use-cases/create-habit'
import type { makeListHabits } from '@/use-cases/list-habits'
import type { makeLogHabit } from '@/use-cases/log-habit'
import { ForbiddenError } from '@/errors/use-case-error'

// Default heads-up (minutes) for an event the assistant creates without an
// explicit reminder, so a WhatsApp-made event actually schedules an alert.
const ASSISTANT_DEFAULT_REMINDER_MINUTES = 30

// Reads and mutations the assistant surface delegates to. Typed as the existing
// use-case functions (ReturnType), so this stays in lock-step with them and the
// container just passes the already-built use cases.
export type AssistantToolsDeps = {
  users: Pick<UserRepository, 'findById'>
  clock: Clock
  weather: WeatherProvider
  getDailyBoard: ReturnType<typeof makeGetDailyBoard>
  listUserLists: ReturnType<typeof makeListUserLists>
  listCalendarEvents: ReturnType<typeof makeListCalendarEvents>
  createTask: ReturnType<typeof makeCreateTask>
  updateTask: ReturnType<typeof makeUpdateTask>
  deleteTask: ReturnType<typeof makeDeleteTask>
  bringTaskToToday: ReturnType<typeof makeBringTaskToToday>
  createList: ReturnType<typeof makeCreateList>
  createSubtask: ReturnType<typeof makeCreateSubtask>
  updateSubtask: ReturnType<typeof makeUpdateSubtask>
  createCalendarEvent: ReturnType<typeof makeCreateCalendarEvent>
  updateCalendarEvent: ReturnType<typeof makeUpdateCalendarEvent>
  updateCalendarOccurrence: ReturnType<typeof makeUpdateCalendarOccurrence>
  deleteCalendarOccurrence: ReturnType<typeof makeDeleteCalendarOccurrence>
  deleteCalendarEvent: ReturnType<typeof makeDeleteCalendarEvent>
  setWeatherLocation: ReturnType<typeof makeSetWeatherLocation>
  setAssistantProfile: ReturnType<typeof makeSetAssistantProfile>
  createHabit: ReturnType<typeof makeCreateHabit>
  listHabits: ReturnType<typeof makeListHabits>
  logHabit: ReturnType<typeof makeLogHabit>
}

const DAY_MS = 24 * 60 * 60 * 1000

export function makeAssistantTools(deps: AssistantToolsDeps): AssistantTools {
  const {
    users,
    clock,
    weather,
    getDailyBoard,
    listUserLists,
    listCalendarEvents,
    createTask,
    updateTask,
    deleteTask,
    bringTaskToToday,
    createList,
    createSubtask,
    updateSubtask,
    createCalendarEvent,
    updateCalendarEvent,
    updateCalendarOccurrence,
    deleteCalendarOccurrence,
    deleteCalendarEvent,
    setWeatherLocation,
    setAssistantProfile,
    createHabit,
    listHabits,
    logHabit,
  } = deps

  // The assistant emits offset-aware local ISO (e.g. ...-03:00); the calendar
  // use cases validate strict UTC (`z.string().datetime()`). Normalize to the
  // same instant in UTC before handing off.
  const toUtcIso = (value: string): string => new Date(value).toISOString()

  const timezoneOf = async (userId: string): Promise<string> => {
    const user = await users.findById(asEntityId(userId))
    return user?.timezone ?? DEFAULT_TIME_ZONE
  }

  return {
    async getContext(userId) {
      const user = await users.findById(asEntityId(userId))
      const timezone = user?.timezone ?? DEFAULT_TIME_ZONE
      const now = clock.now()
      return {
        timezone,
        nowIso: zonedIso(now, timezone),
        weekday: zonedWeekday(now, timezone),
        defaultWeatherLocation: user?.weatherLocation ?? null,
        memory: user ? summarizeAssistantProfile(user.assistantProfile) : '',
      }
    },
    async getToday(userId) {
      const timezone = await timezoneOf(userId)
      const date = civilDate(clock.now(), timezone)
      const board = await getDailyBoard(userId, date)
      return {
        tasks: board.tasks.map(task => ({
          id: task.id,
          title: task.title,
          status: task.status,
        })),
      }
    },
    async getLists(userId) {
      const page = await listUserLists(userId, {
        type: null,
        limit: 100,
        cursor: null,
      })
      return {
        lists: page.items.map(list => ({ id: list.id, title: list.title })),
      }
    },
    async getAgenda(userId, range) {
      const timezone = await timezoneOf(userId)
      const now = clock.now()
      const parseOr = (value: string | undefined, fallback: Date): Date => {
        if (!value) return fallback
        const parsed = new Date(value)
        return Number.isNaN(parsed.getTime()) ? fallback : parsed
      }
      const from = parseOr(range?.from, now)
      // Default to a 30-day look-ahead; cap the window at 180 days so a wide
      // request can't pull an unbounded number of recurring occurrences.
      const to = parseOr(range?.to, new Date(from.getTime() + 30 * DAY_MS))
      const cappedTo = new Date(
        Math.min(to.getTime(), from.getTime() + 180 * DAY_MS),
      )
      const events = await listCalendarEvents(userId, {
        from: from.toISOString(),
        to: cappedTo.toISOString(),
      })
      return {
        // Times go out in the user's zone (with offset) so the model reads and
        // echoes local wall-clock times, not UTC. seriesId/occurrenceStart let
        // it target one occurrence of a recurring series.
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          startsAt: zonedIso(new Date(event.startsAt), timezone),
          endsAt: zonedIso(new Date(event.endsAt), timezone),
          seriesId: event.seriesId,
          occurrenceStart: event.occurrenceStart,
        })),
      }
    },
    async getWeather(query) {
      return weather.getForecast(query)
    },
    async setDefaultWeatherLocation(userId, location) {
      // Route through the same validated use case the REST API uses, so there
      // is one path. A missing user surfaces the defensive { ok: false }.
      try {
        const view = await setWeatherLocation(userId, { location })
        return { ok: true, location: view.weatherLocation }
      } catch (error) {
        if (error instanceof NotFoundError) return { ok: false, location: null }
        throw error
      }
    },
    async updateAssistantMemory(userId, update) {
      // Same single validated path as the settings screen; a missing user is a
      // defensive no-op so a stale session can't crash the turn.
      try {
        const view = await setAssistantProfile(userId, update)
        return {
          ok: true,
          memory: summarizeAssistantProfile({
            homeLocation: view.assistantProfile.homeLocation,
            workLocation: view.assistantProfile.workLocation,
            wakeHour: view.assistantProfile.wakeHour,
            quietHoursStart: view.assistantProfile.quietHoursStart,
            quietHoursEnd: view.assistantProfile.quietHoursEnd,
            briefEnabled: view.assistantProfile.briefEnabled,
            briefHour: view.assistantProfile.briefHour,
            nudgesEnabled: view.assistantProfile.nudgesEnabled,
            people: view.assistantProfile.people,
            notes: view.assistantProfile.notes,
          }),
        }
      } catch (error) {
        if (error instanceof NotFoundError) return { ok: false, memory: '' }
        throw error
      }
    },
    async addTask(userId, input) {
      let listId = input.listId
      if (!listId) {
        const timezone = await timezoneOf(userId)
        const date = civilDate(clock.now(), timezone)
        const board = await getDailyBoard(userId, date)
        listId = board.list.id
      }
      const task = await createTask(userId, { listId, title: input.title })
      return { id: task.id, added: true }
    },
    async completeTask(userId, taskId) {
      await updateTask(userId, taskId, { status: 'completed' })
      return { ok: true }
    },
    async reopenTask(userId, taskId) {
      await updateTask(userId, taskId, { status: 'pending' })
      return { ok: true }
    },
    async renameTask(userId, taskId, title) {
      await updateTask(userId, taskId, { title })
      return { ok: true }
    },
    async deleteTask(userId, taskId) {
      await deleteTask(userId, taskId)
      return { ok: true }
    },
    async moveTaskToToday(userId, taskId) {
      await bringTaskToToday(userId, taskId)
      return { ok: true }
    },
    async createList(userId, title) {
      const list = await createList(userId, { title })
      return { id: list.id }
    },
    async getHabits(userId) {
      const views = await listHabits(userId)
      return {
        habits: views.map(view => ({
          id: view.id,
          title: view.title,
          currentStreak: view.currentStreak,
          doneToday: view.doneToday,
          scheduledToday: view.scheduledToday,
          active: view.active,
        })),
      }
    },
    async addHabit(userId, input) {
      // The free-plan single-habit cap surfaces as a defensive { added: false }
      // so the agent can explain the limit instead of the turn erroring out.
      try {
        const habit = await createHabit(userId, {
          title: input.title,
          cadence: input.cadence,
          checkinHour: input.checkinHour ?? null,
        })
        return { id: habit.id, added: true }
      } catch (error) {
        if (error instanceof ForbiddenError) return { id: '', added: false }
        throw error
      }
    },
    async logHabit(userId, habitId, input) {
      const view = await logHabit(userId, habitId, input ?? {})
      return {
        ok: true,
        currentStreak: view.currentStreak,
        doneToday: view.doneToday,
      }
    },
    async addSubtask(userId, taskId, title) {
      const subtask = await createSubtask(userId, taskId, { title })
      return { id: subtask.id }
    },
    async completeSubtask(userId, subtaskId) {
      await updateSubtask(userId, subtaskId, { status: 'completed' })
      return { ok: true }
    },
    async addEvent(userId, input) {
      const event = await createCalendarEvent(userId, {
        title: input.title,
        startsAt: toUtcIso(input.startsAt),
        endsAt: toUtcIso(input.endsAt),
        description: input.description ?? null,
        location: input.location ?? null,
        allDay: input.allDay,
        // Default a reminder when the assistant did not set one, so an event
        // created over WhatsApp actually schedules a heads-up instead of
        // silently relying on the calendar provider's own default reminders.
        reminders: input.reminders?.length
          ? input.reminders
          : [ASSISTANT_DEFAULT_REMINDER_MINUTES],
      })
      return { id: event.id, added: true }
    },
    async updateEvent(userId, eventId, input) {
      await updateCalendarEvent(userId, eventId, {
        ...input,
        ...(input.startsAt ? { startsAt: toUtcIso(input.startsAt) } : {}),
        ...(input.endsAt ? { endsAt: toUtcIso(input.endsAt) } : {}),
      })
      return { ok: true }
    },
    async rescheduleOccurrence(userId, input) {
      await updateCalendarOccurrence(userId, input.seriesId, {
        occurrenceStart: toUtcIso(input.occurrenceStart),
        title: input.title,
        startsAt: toUtcIso(input.startsAt),
        endsAt: toUtcIso(input.endsAt),
      })
      return { ok: true }
    },
    async cancelOccurrence(userId, input) {
      await deleteCalendarOccurrence(
        userId,
        input.seriesId,
        toUtcIso(input.occurrenceStart),
      )
      return { ok: true }
    },
    async deleteEvent(userId, eventId) {
      await deleteCalendarEvent(userId, eventId)
      return { ok: true }
    },
  }
}
