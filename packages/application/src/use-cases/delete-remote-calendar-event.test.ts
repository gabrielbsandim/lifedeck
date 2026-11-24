import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeDeleteRemoteCalendarEvent } from '@/use-cases/delete-remote-calendar-event'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function provider(
  deleteEvent = vi.fn().mockResolvedValue(undefined),
): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue({
      accessToken: 'access-2',
      expiresAt: new Date('2026-06-24T11:00:00.000Z'),
    }),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent,
    watch: vi.fn(),
  }
}

describe('deleteRemoteCalendarEvent', () => {
  it('deletes the remote event when a connection exists', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
        tokenExpiresAt: NOW,
        now: NOW,
      }),
    )
    const deleteEvent = vi.fn().mockResolvedValue(undefined)
    const remove = makeDeleteRemoteCalendarEvent({
      calendarConnections,
      providers: { get: () => provider(deleteEvent) },
      clock: { now: () => NOW },
    })
    expect(await remove(OWNER_ID, 'g-1')).toEqual({ deleted: true })
    const [usedConnection] = deleteEvent.mock.calls[0] as [CalendarConnection]
    expect(usedConnection.accessToken).toBe('access-2')
  })

  it('is a no-op when no calendar is connected', async () => {
    const remove = makeDeleteRemoteCalendarEvent({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      providers: { get: () => provider() },
      clock: { now: () => NOW },
    })
    expect(await remove(OWNER_ID, 'g-1')).toEqual({ deleted: false })
  })
})
