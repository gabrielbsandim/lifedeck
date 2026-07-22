import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makePullCalendarChanges } from '@/use-cases/pull-calendar-changes'
import { REMINDER_JOB } from '@/use-cases/reminder-jobs'
import type {
  CalendarProvider,
  CalendarSyncPage,
  ExternalCalendarEvent,
} from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

let counter = 0
const ids = {
  generate: () =>
    asEntityId(
      `cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12, '0')}`,
    ),
}

function external(
  overrides: Partial<ExternalCalendarEvent> = {},
): ExternalCalendarEvent {
  return {
    externalId: 'g-1',
    etag: 'etag-1',
    title: 'From Google',
    description: null,
    location: null,
    startsAt: new Date('2026-06-25T09:00:00.000Z'),
    endsAt: new Date('2026-06-25T10:00:00.000Z'),
    allDay: false,
    recurrence: null,
    reminders: [],
    updatedAt: new Date('2026-06-24T09:00:00.000Z'),
    recurringEventExternalId: null,
    originalStartsAt: null,
    cancelledOccurrence: false,
    deleted: false,
    ...overrides,
  }
}

function providerWith(
  page: CalendarSyncPage,
  refresh?: ReturnType<typeof vi.fn>,
): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn(),
    refreshAccessToken:
      refresh ??
      vi.fn().mockResolvedValue({
        accessToken: 'fresh',
        expiresAt: new Date('2026-06-24T12:00:00.000Z'),
      }),
    listChanges: vi.fn().mockResolvedValue(page),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn(),
  }
}

async function withConnection(
  tokenExpiresAt = new Date('2026-06-24T11:00:00.000Z'),
) {
  const calendarConnections = new InMemoryCalendarConnectionRepository()
  await calendarConnections.save(
    CalendarConnection.create({
      id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      ownerId: asEntityId(OWNER_ID),
      provider: 'google',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt,
      now: NOW,
    }),
  )
  return calendarConnections
}

describe('pullCalendarChanges', () => {
  it('creates a local event from a new remote event', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const provider = providerWith({
      events: [external()],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID)

    expect(result.applied).toBe(1)
    const stored = await calendarEvents.findByExternalId(
      asEntityId(OWNER_ID),
      'g-1',
    )
    expect(stored?.source).toBe('google')
    const connection = await calendarConnections.findDefaultByOwner(
      asEntityId(OWNER_ID),
    )
    expect(connection?.syncToken).toBe('sync-2')
  })

  it('arms reminder jobs for a synced event that carries reminders', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const provider = providerWith({
      events: [external({ reminders: [10, 30] })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue },
      ids,
      clock: { now: () => NOW },
    })

    await pull(OWNER_ID)

    const reminders = enqueue.mock.calls
      .map(call => call[0])
      .filter(job => job.type === REMINDER_JOB)
    expect(
      reminders.map(job => job.payload.minutesBefore).sort((a, b) => a - b),
    ).toEqual([10, 30])
    // The event starts 2026-06-25T09:00Z, so the 30-min reminder fires at 08:30.
    const thirty = reminders.find(job => job.payload.minutesBefore === 30)
    expect(thirty?.runAt.toISOString()).toBe('2026-06-25T08:30:00.000Z')
  })

  it('force backfills reminders onto an unchanged event without clobbering content', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    // The local copy is newer than the remote, so a normal pull would skip it.
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        ownerId: asEntityId(OWNER_ID),
        title: 'Dentist (local edit)',
        startsAt: new Date('2026-06-25T09:00:00.000Z'),
        endsAt: new Date('2026-06-25T10:00:00.000Z'),
        source: 'google',
        externalId: 'g-1',
        now: NOW,
      }),
    )
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const provider = providerWith({
      // Remote is older (default updatedAt) but carries a reminder offset.
      events: [external({ title: 'From Google', reminders: [15] })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID, { force: true })

    expect(result.applied).toBe(1)
    const stored = await calendarEvents.findByExternalId(
      asEntityId(OWNER_ID),
      'g-1',
    )
    // Reminder imported, but the newer local title is preserved.
    expect(stored?.reminders).toEqual([15])
    expect(stored?.toJSON().title).toBe('Dentist (local edit)')
    const reminders = enqueue.mock.calls
      .map(call => call[0])
      .filter(job => job.type === REMINDER_JOB)
    expect(reminders.map(job => job.payload.minutesBefore)).toEqual([15])
  })

  it('leaves an unchanged event untouched without force', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        ownerId: asEntityId(OWNER_ID),
        title: 'Dentist',
        startsAt: new Date('2026-06-25T09:00:00.000Z'),
        endsAt: new Date('2026-06-25T10:00:00.000Z'),
        source: 'google',
        externalId: 'g-1',
        now: NOW,
      }),
    )
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const provider = providerWith({
      events: [external({ reminders: [15] })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue },
      ids,
      clock: { now: () => NOW },
    })

    expect((await pull(OWNER_ID)).applied).toBe(0)
    expect(enqueue.mock.calls.some(call => call[0].type === REMINDER_JOB)).toBe(
      false,
    )
  })

  it('does not arm reminders for a cancelled occurrence', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const provider = providerWith({
      events: [
        external({
          externalId: 'g-master_20260715T180000Z',
          recurringEventExternalId: 'g-master',
          originalStartsAt: new Date('2026-07-15T18:00:00.000Z'),
          cancelledOccurrence: true,
          reminders: [10],
        }),
      ],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue },
      ids,
      clock: { now: () => NOW },
    })

    await pull(OWNER_ID)

    expect(enqueue.mock.calls.some(call => call[0].type === REMINDER_JOB)).toBe(
      false,
    )
  })

  it('stores a cancelled occurrence as an override, not a deletion', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const provider = providerWith({
      events: [
        external({
          externalId: 'g-master_20260715T180000Z',
          title: 'English Class',
          recurringEventExternalId: 'g-master',
          originalStartsAt: new Date('2026-07-15T18:00:00.000Z'),
          cancelledOccurrence: true,
          deleted: false,
        }),
      ],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID)

    expect(result.applied).toBe(1)
    const stored = await calendarEvents.findOverrideByOriginalStart(
      asEntityId(OWNER_ID),
      'g-master',
      new Date('2026-07-15T18:00:00.000Z'),
    )
    expect(stored?.cancelled).toBe(true)
    expect(stored?.recurrenceMasterExternalId).toBe('g-master')
  })

  it('updates an existing occurrence override when the remote is newer', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        ownerId: asEntityId(OWNER_ID),
        title: 'English Class',
        startsAt: new Date('2026-07-15T18:00:00.000Z'),
        endsAt: new Date('2026-07-15T18:50:00.000Z'),
        source: 'google',
        externalId: 'g-master_20260715T180000Z',
        recurrenceMasterExternalId: 'g-master',
        originalStartsAt: new Date('2026-07-15T18:00:00.000Z'),
        now: new Date('2026-06-23T00:00:00.000Z'),
      }),
    )
    const provider = providerWith({
      events: [
        external({
          externalId: 'g-master_20260715T180000Z',
          title: 'English (moved)',
          startsAt: new Date('2026-07-15T19:00:00.000Z'),
          endsAt: new Date('2026-07-15T19:50:00.000Z'),
          recurringEventExternalId: 'g-master',
          originalStartsAt: new Date('2026-07-15T18:00:00.000Z'),
          updatedAt: NOW,
        }),
      ],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    await pull(OWNER_ID)

    const stored = await calendarEvents.findOverrideByOriginalStart(
      asEntityId(OWNER_ID),
      'g-master',
      new Date('2026-07-15T18:00:00.000Z'),
    )
    expect(stored?.title).toBe('English (moved)')
    expect(stored?.startsAt.toISOString()).toBe('2026-07-15T19:00:00.000Z')
  })

  it('adopts a remote change that is newer than the local copy', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const local = CalendarEvent.create({
      id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      ownerId: asEntityId(OWNER_ID),
      title: 'Old title',
      startsAt: new Date('2026-06-25T09:00:00.000Z'),
      endsAt: new Date('2026-06-25T10:00:00.000Z'),
      source: 'google',
      externalId: 'g-1',
      etag: 'etag-0',
      now: new Date('2026-06-23T00:00:00.000Z'),
    })
    await calendarEvents.save(local)
    const provider = providerWith({
      events: [external({ title: 'New title', updatedAt: NOW })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID)

    expect(result.applied).toBe(1)
    const stored = await calendarEvents.findByExternalId(
      asEntityId(OWNER_ID),
      'g-1',
    )
    expect(stored?.toJSON().title).toBe('New title')
  })

  it('keeps the local copy when the remote change is stale', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const local = CalendarEvent.create({
      id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      ownerId: asEntityId(OWNER_ID),
      title: 'Local wins',
      startsAt: new Date('2026-06-25T09:00:00.000Z'),
      endsAt: new Date('2026-06-25T10:00:00.000Z'),
      source: 'google',
      externalId: 'g-1',
      now: NOW,
    })
    await calendarEvents.save(local)
    const provider = providerWith({
      events: [
        external({
          title: 'Stale',
          updatedAt: new Date('2026-06-23T00:00:00.000Z'),
        }),
      ],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID)

    expect(result.applied).toBe(0)
    const stored = await calendarEvents.findByExternalId(
      asEntityId(OWNER_ID),
      'g-1',
    )
    expect(stored?.toJSON().title).toBe('Local wins')
  })

  it('deletes a local event when the remote is removed', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const local = CalendarEvent.create({
      id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      ownerId: asEntityId(OWNER_ID),
      title: 'To delete',
      startsAt: new Date('2026-06-25T09:00:00.000Z'),
      endsAt: new Date('2026-06-25T10:00:00.000Z'),
      source: 'google',
      externalId: 'g-1',
      now: NOW,
    })
    await calendarEvents.save(local)
    const provider = providerWith({
      events: [external({ deleted: true })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    expect((await pull(OWNER_ID)).applied).toBe(1)
    expect(
      await calendarEvents.findByExternalId(asEntityId(OWNER_ID), 'g-1'),
    ).toBeNull()
  })

  it('ignores a remote deletion of an unknown event', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    const provider = providerWith({
      events: [external({ deleted: true })],
      nextSyncToken: null,
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })
    expect((await pull(OWNER_ID)).applied).toBe(0)
  })

  it('refreshes an expired access token before syncing', async () => {
    const calendarConnections = await withConnection(
      new Date('2026-06-24T09:00:00.000Z'),
    )
    const calendarEvents = new InMemoryCalendarEventRepository()
    const refresh = vi.fn().mockResolvedValue({
      accessToken: 'fresh',
      expiresAt: new Date('2026-06-24T12:00:00.000Z'),
    })
    const provider = providerWith(
      { events: [], nextSyncToken: 'sync-2' },
      refresh,
    )
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    await pull(OWNER_ID)

    expect(refresh).toHaveBeenCalledWith('refresh-1')
    const connection = await calendarConnections.findDefaultByOwner(
      asEntityId(OWNER_ID),
    )
    expect(connection?.accessToken).toBe('fresh')
  })

  it('pulls every connection and tags events with their connection', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accountEmail: 'personal@example.com',
        accessToken: 'a',
        refreshToken: 'r',
        tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
        now: NOW,
      }),
    )
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accountEmail: 'work@example.com',
        accessToken: 'a2',
        refreshToken: 'r2',
        tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
        now: NOW,
      }),
    )
    const calendarEvents = new InMemoryCalendarEventRepository()
    const provider = providerWith({
      events: [external()],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    const result = await pull(OWNER_ID)

    // The same remote id from two calendars stays distinct because the lookup
    // is scoped by connection, so each calendar keeps its own local copy.
    expect(result.applied).toBe(2)
    expect(provider.listChanges).toHaveBeenCalledTimes(2)
    const events = await calendarEvents.listByOwner(asEntityId(OWNER_ID))
    expect(new Set(events.map(event => event.connectionId))).toEqual(
      new Set([
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      ]),
    )
  })

  it('updates the copy already tagged to the connection', async () => {
    const calendarConnections = await withConnection()
    const calendarEvents = new InMemoryCalendarEventRepository()
    await calendarEvents.save(
      CalendarEvent.create({
        id: asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
        ownerId: asEntityId(OWNER_ID),
        title: 'Old title',
        startsAt: new Date('2026-06-25T09:00:00.000Z'),
        endsAt: new Date('2026-06-25T10:00:00.000Z'),
        source: 'google',
        connectionId: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        externalId: 'g-1',
        now: new Date('2026-06-23T00:00:00.000Z'),
      }),
    )
    const provider = providerWith({
      events: [external({ title: 'New title', updatedAt: NOW })],
      nextSyncToken: 'sync-2',
    })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    expect((await pull(OWNER_ID)).applied).toBe(1)
    const stored = await calendarEvents.findByExternalId(
      asEntityId(OWNER_ID),
      'g-1',
    )
    expect(stored?.toJSON().title).toBe('New title')
    // No duplicate was created.
    expect(await calendarEvents.listByOwner(asEntityId(OWNER_ID))).toHaveLength(
      1,
    )
  })

  it('keeps syncing other connections when one fails', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accountEmail: 'personal@example.com',
        accessToken: 'a',
        refreshToken: 'r',
        tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
        now: NOW,
      }),
    )
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accountEmail: 'work@example.com',
        accessToken: 'a2',
        refreshToken: 'r2',
        tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
        now: NOW,
      }),
    )
    const calendarEvents = new InMemoryCalendarEventRepository()
    const provider = providerWith({
      events: [external()],
      nextSyncToken: 'sync-2',
    })
    // The first connection's sync throws; the second must still sync.
    provider.listChanges = vi
      .fn()
      .mockRejectedValueOnce(new Error('revoked'))
      .mockResolvedValue({ events: [external()], nextSyncToken: 'sync-2' })
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents,
      providers: { get: () => provider },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })

    expect((await pull(OWNER_ID)).applied).toBe(1)
  })

  it('rejects when the user has no calendar connection', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    const pull = makePullCalendarChanges({
      calendarConnections,
      calendarEvents: new InMemoryCalendarEventRepository(),
      providers: {
        get: () => providerWith({ events: [], nextSyncToken: null }),
      },
      jobQueue: { enqueue: vi.fn() },
      ids,
      clock: { now: () => NOW },
    })
    await expect(pull(OWNER_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
