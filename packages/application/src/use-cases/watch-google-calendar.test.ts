import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeWatchGoogleCalendar } from '@/use-cases/watch-google-calendar'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function provider(): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn().mockResolvedValue({
      channelId: 'chan-1',
      resourceId: 'res-1',
      expiresAt: new Date('2026-07-01T10:00:00.000Z'),
    }),
  }
}

describe('watchGoogleCalendar', () => {
  it('opens a watch channel and stores it on the connection', async () => {
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
    const watch = makeWatchGoogleCalendar({
      calendarConnections,
      provider: provider(),
      clock: { now: () => NOW },
    })

    const result = await watch(OWNER_ID, 'https://cb/webhooks/google')

    expect(result).toEqual({ watched: 1 })
    const stored = await calendarConnections.findByChannelId('chan-1')
    expect(stored?.ownerId).toBe(OWNER_ID)
  })

  it('is a no-op when the user has no connection', async () => {
    const watch = makeWatchGoogleCalendar({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      provider: provider(),
      clock: { now: () => NOW },
    })
    await expect(watch(OWNER_ID, 'https://cb')).resolves.toEqual({
      watched: 0,
    })
  })
})
