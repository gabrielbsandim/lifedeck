import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeConnectGoogleCalendar } from '@/use-cases/connect-google-calendar'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function setup(email: string | null = 'personal@example.com') {
  const calendarConnections = new InMemoryCalendarConnectionRepository()
  let counter = 0
  const provider: CalendarProvider = {
    provider: 'google',
    exchangeCode: vi.fn().mockResolvedValue({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresAt: new Date('2026-06-24T11:00:00.000Z'),
      accountEmail: email,
    }),
    refreshAccessToken: vi.fn(),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn(),
  }
  const connect = makeConnectGoogleCalendar({
    calendarConnections,
    provider,
    ids: {
      generate: () =>
        asEntityId(
          `cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12, '0')}`,
        ),
    },
    clock: { now: () => NOW },
  })
  return { calendarConnections, connect, provider }
}

describe('connectGoogleCalendar', () => {
  it('stores a new default connection from an authorization code', async () => {
    const { calendarConnections, connect } = setup()
    const result = await connect(OWNER_ID, 'auth-code', 'https://cb')
    expect(result.connected).toBe(true)
    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(1)
    expect(stored[0]?.id).toBe(result.connectionId)
    expect(stored[0]?.accountEmail).toBe('personal@example.com')
    expect(stored[0]?.isDefault).toBe(true)
    expect(stored[0]?.refreshToken).toBe('refresh-1')
  })

  it('refreshes the same account in place instead of duplicating it', async () => {
    const { calendarConnections, connect } = setup()
    const first = await connect(OWNER_ID, 'auth-code', 'https://cb')
    const second = await connect(OWNER_ID, 'auth-code-2', 'https://cb')
    expect(second.connectionId).toBe(first.connectionId)
    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(1)
    expect(stored[0]?.accessToken).toBe('access-1')
  })

  it('adopts and backfills a single legacy connection with no account email', async () => {
    const { calendarConnections, connect } = setup('personal@example.com')
    await calendarConnections.save(
      CalendarConnection.create({
        id: asEntityId('11111111-1111-4111-8111-111111111111'),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        // legacy connection created before account email was captured
        accountEmail: null,
        isDefault: true,
        accessToken: 'old',
        refreshToken: 'old-refresh',
        tokenExpiresAt: NOW,
        now: NOW,
      }),
    )

    const result = await connect(OWNER_ID, 'auth-code', 'https://cb')

    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(1)
    expect(result.connectionId).toBe('11111111-1111-4111-8111-111111111111')
    expect(stored[0]?.accountEmail).toBe('personal@example.com')
    expect(stored[0]?.accessToken).toBe('access-1')
  })

  it('adds a second connection for a different account', async () => {
    const { calendarConnections, connect } = setup('personal@example.com')
    await connect(OWNER_ID, 'auth-code', 'https://cb')

    const work = setup('work@example.com')
    // Reuse the same repo to simulate the same user connecting a second account.
    const connectWork = makeConnectGoogleCalendar({
      calendarConnections,
      provider: work.provider,
      ids: {
        generate: () => asEntityId('dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
      },
      clock: { now: () => NOW },
    })
    await connectWork(OWNER_ID, 'auth-code-3', 'https://cb')

    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(2)
    expect(stored.filter(c => c.isDefault)).toHaveLength(1)
    expect(stored[0]?.isDefault).toBe(true)
    expect(stored[1]?.accountEmail).toBe('work@example.com')
    expect(stored[1]?.isDefault).toBe(false)
  })
})
