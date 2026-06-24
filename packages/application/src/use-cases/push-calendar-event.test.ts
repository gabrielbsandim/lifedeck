import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makePushCalendarEvent } from '@/use-cases/push-calendar-event'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const EVENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'

function provider(
  push = vi.fn().mockResolvedValue({ externalId: 'g-9', etag: 'etag-9' }),
): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    listChanges: vi.fn(),
    pushEvent: push,
    deleteEvent: vi.fn(),
    watch: vi.fn(),
  }
}

async function localEvent(events: InMemoryCalendarEventRepository) {
  await events.save(
    CalendarEvent.create({
      id: asEntityId(EVENT_ID),
      ownerId: asEntityId(OWNER_ID),
      title: 'Local',
      startsAt: new Date('2026-06-25T09:00:00.000Z'),
      endsAt: new Date('2026-06-25T10:00:00.000Z'),
      now: NOW,
    }),
  )
}

async function connection(repo: InMemoryCalendarConnectionRepository) {
  await repo.save(
    CalendarConnection.create({
      id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      ownerId: asEntityId(OWNER_ID),
      provider: 'google',
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      tokenExpiresAt: new Date('2026-06-24T12:00:00.000Z'),
      now: NOW,
    }),
  )
}

describe('pushCalendarEvent', () => {
  it('pushes a local event and stores its external link', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    const calendarEvents = new InMemoryCalendarEventRepository()
    await connection(calendarConnections)
    await localEvent(calendarEvents)
    const push = makePushCalendarEvent({
      calendarConnections,
      calendarEvents,
      provider: provider(),
      clock: { now: () => NOW },
    })

    expect(await push(OWNER_ID, EVENT_ID)).toEqual({ pushed: true })
    const stored = await calendarEvents.findById(asEntityId(EVENT_ID))
    expect(stored?.externalId).toBe('g-9')
  })

  it('is a no-op when no calendar is connected', async () => {
    const calendarEvents = new InMemoryCalendarEventRepository()
    await localEvent(calendarEvents)
    const push = makePushCalendarEvent({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      calendarEvents,
      provider: provider(),
      clock: { now: () => NOW },
    })
    expect(await push(OWNER_ID, EVENT_ID)).toEqual({ pushed: false })
  })

  it('rejects pushing an event owned by someone else', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await connection(calendarConnections)
    const push = makePushCalendarEvent({
      calendarConnections,
      calendarEvents: new InMemoryCalendarEventRepository(),
      provider: provider(),
      clock: { now: () => NOW },
    })
    await expect(push(OWNER_ID, EVENT_ID)).rejects.toBeInstanceOf(NotFoundError)
  })
})
