import { describe, expect, it, vi } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeConnectGoogleCalendar } from '@/use-cases/connect-google-calendar'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function provider(): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn().mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: new Date('2026-06-24T11:00:00.000Z'),
    }),
    refreshAccessToken: vi.fn(),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn(),
  }
}

function setup(
  calendarConnections = new InMemoryCalendarConnectionRepository(),
) {
  let counter = 0
  const connect = makeConnectGoogleCalendar({
    calendarConnections,
    provider: provider(),
    ids: {
      generate: () =>
        asEntityId(
          `cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12, '0')}`,
        ),
    },
    clock: { now: () => NOW },
  })
  return { calendarConnections, connect }
}

describe('connectGoogleCalendar', () => {
  it('stores a new connection from an authorization code', async () => {
    const { calendarConnections, connect } = setup()
    const result = await connect(OWNER_ID, 'auth-code', 'https://cb')
    expect(result).toEqual({ connected: true })
    const stored = await calendarConnections.findByOwner(asEntityId(OWNER_ID))
    expect(stored?.refreshToken).toBe('refresh-1')
  })

  it('refreshes the tokens of an existing connection', async () => {
    const { calendarConnections, connect } = setup()
    await connect(OWNER_ID, 'auth-code', 'https://cb')
    await connect(OWNER_ID, 'auth-code-2', 'https://cb')
    const stored = await calendarConnections.findByOwner(asEntityId(OWNER_ID))
    expect(stored?.accessToken).toBe('access-1')
  })
})
