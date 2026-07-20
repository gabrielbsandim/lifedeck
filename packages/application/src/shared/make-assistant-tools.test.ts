import { describe, expect, it, vi } from 'vitest'
import { User, asEntityId } from '@lifedeck/domain'
import {
  makeAssistantTools,
  type AssistantToolsDeps,
} from '@/shared/make-assistant-tools'
import { NotFoundError } from '@/errors/use-case-error'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const NOW = new Date('2026-07-19T12:00:00.000Z')

function user(overrides?: { timezone?: string; weatherLocation?: string }) {
  const u = User.createGuest({
    id: asEntityId(USER_ID),
    displayName: 'Gabriel',
    locale: 'pt',
    timezone: overrides?.timezone ?? 'America/Sao_Paulo',
    createdAt: NOW,
  })
  if (overrides?.weatherLocation)
    u.setWeatherLocation(overrides.weatherLocation)
  return u
}

// A fully-faked deps bag; each test overrides only what it asserts on.
function build(overrides: Partial<AssistantToolsDeps> = {}) {
  const deps: AssistantToolsDeps = {
    users: { findById: async () => user() },
    clock: { now: () => NOW },
    weather: {
      getForecast: async () => ({ ok: false, reason: 'unavailable' }),
      resolveLocation: async () => ({ ok: false, reason: 'unavailable' }),
    },
    getDailyBoard: vi.fn(async () => ({
      list: { id: 'list-1' },
      tasks: [{ id: 'task-1', title: 'Buy milk', status: 'pending' }],
    })) as unknown as AssistantToolsDeps['getDailyBoard'],
    listUserLists: vi.fn(async () => ({
      items: [{ id: 'list-1', title: 'Today' }],
    })) as unknown as AssistantToolsDeps['listUserLists'],
    listCalendarEvents: vi.fn(
      async () => [],
    ) as unknown as AssistantToolsDeps['listCalendarEvents'],
    createTask: vi.fn(async () => ({
      id: 'task-1',
    })) as unknown as AssistantToolsDeps['createTask'],
    updateTask: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['updateTask'],
    deleteTask: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['deleteTask'],
    bringTaskToToday: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['bringTaskToToday'],
    createList: vi.fn(async () => ({
      id: 'list-2',
    })) as unknown as AssistantToolsDeps['createList'],
    createSubtask: vi.fn(async () => ({
      id: 'sub-1',
    })) as unknown as AssistantToolsDeps['createSubtask'],
    updateSubtask: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['updateSubtask'],
    createCalendarEvent: vi.fn(async () => ({
      id: 'event-1',
    })) as unknown as AssistantToolsDeps['createCalendarEvent'],
    updateCalendarEvent: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['updateCalendarEvent'],
    updateCalendarOccurrence: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['updateCalendarOccurrence'],
    deleteCalendarOccurrence: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['deleteCalendarOccurrence'],
    deleteCalendarEvent: vi.fn(
      async () => undefined,
    ) as unknown as AssistantToolsDeps['deleteCalendarEvent'],
    setWeatherLocation: vi.fn(async (_userId: string, input) => ({
      weatherLocation: input.location,
    })) as unknown as AssistantToolsDeps['setWeatherLocation'],
    ...overrides,
  }
  return { tools: makeAssistantTools(deps), deps }
}

describe('makeAssistantTools', () => {
  it('grounds context in the user timezone, saved place, and clock', async () => {
    const { tools } = build({
      users: {
        findById: async () => user({ weatherLocation: 'Rio de Janeiro' }),
      },
    })

    const ctx = await tools.getContext(USER_ID)

    expect(ctx.timezone).toBe('America/Sao_Paulo')
    expect(ctx.defaultWeatherLocation).toBe('Rio de Janeiro')
    // Noon UTC is 09:00 in São Paulo (UTC-3).
    expect(ctx.nowIso).toBe('2026-07-19T09:00:00-03:00')
    expect(ctx.weekday).toBe('Sunday')
  })

  it('defaults a new task to today’s board list when no listId is given', async () => {
    const { tools, deps } = build()

    const result = await tools.addTask(USER_ID, { title: 'Buy milk' })

    expect(result).toEqual({ id: 'task-1', added: true })
    expect(deps.createTask).toHaveBeenCalledWith(USER_ID, {
      listId: 'list-1',
      title: 'Buy milk',
    })
  })

  it('normalizes offset times to UTC and injects a default reminder', async () => {
    const { tools, deps } = build()

    await tools.addEvent(USER_ID, {
      title: 'Dentist',
      startsAt: '2026-07-20T11:30:00-03:00',
      endsAt: '2026-07-20T12:30:00-03:00',
    })

    expect(deps.createCalendarEvent).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({
        startsAt: '2026-07-20T14:30:00.000Z',
        endsAt: '2026-07-20T15:30:00.000Z',
        reminders: [30],
      }),
    )
  })

  it('keeps explicit reminders instead of the default', async () => {
    const { tools, deps } = build()

    await tools.addEvent(USER_ID, {
      title: 'Standup',
      startsAt: '2026-07-20T09:00:00-03:00',
      endsAt: '2026-07-20T09:15:00-03:00',
      reminders: [10, 60],
    })

    expect(deps.createCalendarEvent).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ reminders: [10, 60] }),
    )
  })

  it('completes a task by delegating to updateTask', async () => {
    const { tools, deps } = build()

    await tools.completeTask(USER_ID, 'task-9')

    expect(deps.updateTask).toHaveBeenCalledWith(USER_ID, 'task-9', {
      status: 'completed',
    })
  })

  it('routes setDefaultWeatherLocation through the use case', async () => {
    const setWeatherLocation = vi.fn(async (_userId: string, input) => ({
      weatherLocation: input.location,
    })) as unknown as AssistantToolsDeps['setWeatherLocation']
    const { tools } = build({ setWeatherLocation })

    const result = await tools.setDefaultWeatherLocation(USER_ID, 'Lisbon')

    expect(setWeatherLocation).toHaveBeenCalledWith(USER_ID, {
      location: 'Lisbon',
    })
    expect(result).toEqual({ ok: true, location: 'Lisbon' })
  })

  it('reports { ok: false } when the user is missing', async () => {
    const setWeatherLocation = vi.fn(async () => {
      throw new NotFoundError('User')
    }) as unknown as AssistantToolsDeps['setWeatherLocation']
    const { tools } = build({ setWeatherLocation })

    const result = await tools.setDefaultWeatherLocation(USER_ID, 'Lisbon')

    expect(result).toEqual({ ok: false, location: null })
  })

  it('rethrows a non-NotFound error from the weather-location use case', async () => {
    const setWeatherLocation = vi.fn(async () => {
      throw new Error('db down')
    }) as unknown as AssistantToolsDeps['setWeatherLocation']
    const { tools } = build({ setWeatherLocation })

    await expect(
      tools.setDefaultWeatherLocation(USER_ID, 'Lisbon'),
    ).rejects.toThrow('db down')
  })

  it('honors an explicit agenda range and caps it at 180 days', async () => {
    const listCalendarEvents = vi.fn(
      async () => [],
    ) as unknown as AssistantToolsDeps['listCalendarEvents']
    const { tools } = build({ listCalendarEvents })

    await tools.getAgenda(USER_ID, {
      from: '2026-08-01T00:00:00Z',
      to: '2027-08-01T00:00:00Z',
    })

    const range = (
      listCalendarEvents as unknown as {
        mock: { calls: [string, { from: string; to: string }][] }
      }
    ).mock.calls[0]?.[1]
    expect(range?.from).toBe('2026-08-01T00:00:00.000Z')
    const cap = new Date(
      Date.parse('2026-08-01T00:00:00Z') + 180 * 24 * 60 * 60 * 1000,
    ).toISOString()
    expect(range?.to).toBe(cap)
  })

  it('falls back to now for an unparseable agenda date', async () => {
    const listCalendarEvents = vi.fn(
      async () => [],
    ) as unknown as AssistantToolsDeps['listCalendarEvents']
    const { tools } = build({ listCalendarEvents })

    await tools.getAgenda(USER_ID, { from: 'not-a-date' })

    const range = (
      listCalendarEvents as unknown as {
        mock: { calls: [string, { from: string; to: string }][] }
      }
    ).mock.calls[0]?.[1]
    expect(range?.from).toBe(NOW.toISOString())
  })

  it('reads today’s tasks and the user’s lists', async () => {
    const { tools } = build()

    expect((await tools.getToday(USER_ID)).tasks).toEqual([
      { id: 'task-1', title: 'Buy milk', status: 'pending' },
    ])
    expect((await tools.getLists(USER_ID)).lists).toEqual([
      { id: 'list-1', title: 'Today' },
    ])
  })

  it('adds a task to an explicit list without reading the board', async () => {
    const { tools, deps } = build()

    await tools.addTask(USER_ID, { title: 'Ship it', listId: 'list-9' })

    expect(deps.createTask).toHaveBeenCalledWith(USER_ID, {
      listId: 'list-9',
      title: 'Ship it',
    })
    expect(deps.getDailyBoard).not.toHaveBeenCalled()
  })

  it('reports no saved place when the user has none', async () => {
    const { tools } = build()
    expect((await tools.getContext(USER_ID)).defaultWeatherLocation).toBeNull()
  })

  it('falls back to the default timezone when the user is not found', async () => {
    const { tools } = build({ users: { findById: async () => null } })

    const ctx = await tools.getContext(USER_ID)

    expect(ctx.timezone).toBe('UTC')
    expect(ctx.defaultWeatherLocation).toBeNull()
  })

  it('updates only the fields given, leaving times untouched', async () => {
    const { tools, deps } = build()

    await tools.updateEvent(USER_ID, 'e1', { title: 'Just a rename' })

    expect(deps.updateCalendarEvent).toHaveBeenCalledWith(USER_ID, 'e1', {
      title: 'Just a rename',
    })
  })

  it('delegates the remaining task, list, and subtask mutations', async () => {
    const { tools, deps } = build()

    await tools.reopenTask(USER_ID, 't1')
    expect(deps.updateTask).toHaveBeenCalledWith(USER_ID, 't1', {
      status: 'pending',
    })
    await tools.renameTask(USER_ID, 't1', 'New title')
    expect(deps.updateTask).toHaveBeenCalledWith(USER_ID, 't1', {
      title: 'New title',
    })
    await tools.deleteTask(USER_ID, 't1')
    expect(deps.deleteTask).toHaveBeenCalledWith(USER_ID, 't1')
    await tools.moveTaskToToday(USER_ID, 't1')
    expect(deps.bringTaskToToday).toHaveBeenCalledWith(USER_ID, 't1')

    expect(await tools.createList(USER_ID, 'Groceries')).toEqual({
      id: 'list-2',
    })
    expect(await tools.addSubtask(USER_ID, 't1', 'step')).toEqual({
      id: 'sub-1',
    })
    await tools.completeSubtask(USER_ID, 's1')
    expect(deps.updateSubtask).toHaveBeenCalledWith(USER_ID, 's1', {
      status: 'completed',
    })
  })

  it('delegates the remaining calendar mutations, normalizing times', async () => {
    const { tools, deps } = build()

    await tools.updateEvent(USER_ID, 'e1', {
      title: 'Renamed',
      startsAt: '2026-07-20T09:00:00-03:00',
    })
    expect(deps.updateCalendarEvent).toHaveBeenCalledWith(USER_ID, 'e1', {
      title: 'Renamed',
      startsAt: '2026-07-20T12:00:00.000Z',
    })

    await tools.rescheduleOccurrence(USER_ID, {
      seriesId: 's1',
      occurrenceStart: '2026-07-20T09:00:00-03:00',
      title: 'Haircut',
      startsAt: '2026-07-27T09:00:00-03:00',
      endsAt: '2026-07-27T10:00:00-03:00',
    })
    expect(deps.updateCalendarOccurrence).toHaveBeenCalledWith(USER_ID, 's1', {
      occurrenceStart: '2026-07-20T12:00:00.000Z',
      title: 'Haircut',
      startsAt: '2026-07-27T12:00:00.000Z',
      endsAt: '2026-07-27T13:00:00.000Z',
    })

    await tools.cancelOccurrence(USER_ID, {
      seriesId: 's1',
      occurrenceStart: '2026-07-20T09:00:00-03:00',
    })
    expect(deps.deleteCalendarOccurrence).toHaveBeenCalledWith(
      USER_ID,
      's1',
      '2026-07-20T12:00:00.000Z',
    )

    await tools.deleteEvent(USER_ID, 'e1')
    expect(deps.deleteCalendarEvent).toHaveBeenCalledWith(USER_ID, 'e1')
  })

  it('reads the weather through the provider', async () => {
    const { tools, deps } = build()
    const result = await tools.getWeather({ location: 'Lisbon' })
    expect(deps.weather.getForecast).toBeDefined()
    expect(result).toEqual({ ok: false, reason: 'unavailable' })
  })

  it('maps agenda events into the user local zone', async () => {
    const listCalendarEvents = vi.fn(async () => [
      {
        id: 'event-1',
        title: 'Lunch',
        startsAt: '2026-07-20T15:00:00.000Z',
        endsAt: '2026-07-20T16:00:00.000Z',
        seriesId: null,
        occurrenceStart: null,
      },
    ]) as unknown as AssistantToolsDeps['listCalendarEvents']
    const { tools } = build({ listCalendarEvents })

    const { events } = await tools.getAgenda(USER_ID)

    expect(events[0]).toMatchObject({
      id: 'event-1',
      title: 'Lunch',
      startsAt: '2026-07-20T12:00:00-03:00',
      endsAt: '2026-07-20T13:00:00-03:00',
    })
  })
})
