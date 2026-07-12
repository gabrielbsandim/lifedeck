import { describe, expect, it } from 'vitest'
import { CalendarConnection, CalendarEvent, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { InMemoryCalendarEventRepository } from '@/testing/in-memory-calendar-event-repository'
import { makeDisconnectCalendar } from '@/use-cases/disconnect-calendar'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const LATER = new Date('2026-06-24T12:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function connection(id: string, isDefault: boolean) {
  return CalendarConnection.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    provider: 'google',
    accountEmail: `${id}@example.com`,
    isDefault,
    accessToken: 'a',
    refreshToken: 'r',
    tokenExpiresAt: NOW,
    now: NOW,
  })
}

function event(id: string, connectionId: string) {
  return CalendarEvent.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    title: 'From Google',
    startsAt: new Date('2026-06-25T09:00:00.000Z'),
    endsAt: new Date('2026-06-25T10:00:00.000Z'),
    source: 'google',
    connectionId: asEntityId(connectionId),
    externalId: `ext-${id}`,
    now: NOW,
  })
}

describe('disconnectCalendar', () => {
  it('removes the connection and only its events', async () => {
    const connections = new InMemoryCalendarConnectionRepository()
    await connections.save(connection(A, false))
    await connections.save(connection(B, false))
    const events = new InMemoryCalendarEventRepository()
    await events.save(event('11111111-1111-4111-8111-111111111111', A))
    await events.save(event('22222222-2222-4222-8222-222222222222', B))
    const disconnect = makeDisconnectCalendar({
      calendarConnections: connections,
      calendarEvents: events,
      clock: { now: () => LATER },
    })

    await disconnect(OWNER_ID, A)

    expect(await connections.findById(asEntityId(A))).toBeNull()
    const remaining = await events.listByOwner(asEntityId(OWNER_ID))
    expect(remaining.map(e => e.id)).toEqual([
      '22222222-2222-4222-8222-222222222222',
    ])
  })

  it('promotes another connection to default when the default is removed', async () => {
    const connections = new InMemoryCalendarConnectionRepository()
    await connections.save(connection(A, true))
    await connections.save(connection(B, false))
    const disconnect = makeDisconnectCalendar({
      calendarConnections: connections,
      calendarEvents: new InMemoryCalendarEventRepository(),
      clock: { now: () => LATER },
    })

    await disconnect(OWNER_ID, A)

    const remaining = await connections.listByOwner(asEntityId(OWNER_ID))
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.isDefault).toBe(true)
  })

  it('leaves no default to promote when the last calendar is removed', async () => {
    const connections = new InMemoryCalendarConnectionRepository()
    await connections.save(connection(A, true))
    const disconnect = makeDisconnectCalendar({
      calendarConnections: connections,
      calendarEvents: new InMemoryCalendarEventRepository(),
      clock: { now: () => LATER },
    })

    await disconnect(OWNER_ID, A)

    expect(await connections.listByOwner(asEntityId(OWNER_ID))).toEqual([])
  })

  it('throws for a missing connection', async () => {
    const disconnect = makeDisconnectCalendar({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      calendarEvents: new InMemoryCalendarEventRepository(),
      clock: { now: () => LATER },
    })
    await expect(disconnect(OWNER_ID, A)).rejects.toBeInstanceOf(NotFoundError)
  })
})
