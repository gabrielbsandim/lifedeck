import { describe, expect, it, vi } from 'vitest'
import { ValidationError, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeConnectCalendarWithCredentials } from '@/use-cases/connect-calendar-with-credentials'
import type {
  CalendarProvider,
  CalendarProviderRegistry,
} from '@/ports/calendar-provider'

const NOW = new Date('2026-07-20T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function stub(overrides: Partial<CalendarProvider>): CalendarProvider {
  return {
    provider: 'apple',
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn(),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn(),
    ...overrides,
  } as CalendarProvider
}

function setup() {
  const calendarConnections = new InMemoryCalendarConnectionRepository()
  const apple = stub({
    provider: 'apple',
    connectWithCredentials: vi.fn().mockResolvedValue({
      accountEmail: 'me@icloud.com',
      calendarId: 'https://dav/home/',
    }),
  })
  const calcom = stub({
    provider: 'calcom',
    writable: false,
    connectWithCredentials: vi.fn().mockResolvedValue({
      accountEmail: 'me@cal.com',
      calendarId: 'bookings',
    }),
  })
  const google = stub({ provider: 'google' }) // no connectWithCredentials
  const providers: CalendarProviderRegistry = {
    get: name =>
      name === 'apple' ? apple : name === 'calcom' ? calcom : google,
  }
  let counter = 0
  const connect = makeConnectCalendarWithCredentials({
    calendarConnections,
    providers,
    ids: {
      generate: () =>
        asEntityId(
          `cccccccc-cccc-4ccc-8ccc-${String(++counter).padStart(12, '0')}`,
        ),
    },
    clock: { now: () => NOW },
  })
  return { calendarConnections, connect, apple, calcom }
}

describe('connectCalendarWithCredentials', () => {
  it('creates a default writable connection from a validated secret', async () => {
    const { calendarConnections, connect, apple } = setup()
    const result = await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'app-password',
    })

    expect(apple.connectWithCredentials).toHaveBeenCalledWith({
      accountEmail: 'me@icloud.com',
      secret: 'app-password',
    })
    const [stored] = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored?.id).toBe(result.connectionId)
    expect(stored?.provider).toBe('apple')
    expect(stored?.accountEmail).toBe('me@icloud.com')
    expect(stored?.accessToken).toBe('app-password')
    expect(stored?.refreshToken).toBeNull()
    expect(stored?.isDefault).toBe(true)
    expect(stored?.calendarId).toBe('https://dav/home/')
    expect(stored?.needsRefresh(new Date('2030-01-01T00:00:00.000Z'))).toBe(
      false,
    )
  })

  it('rotates the secret in place when reconnecting the same account', async () => {
    const { calendarConnections, connect } = setup()
    const first = await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'password-1',
    })
    const second = await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'password-2',
    })
    expect(second.connectionId).toBe(first.connectionId)
    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(1)
    expect(stored[0]?.accessToken).toBe('password-2')
  })

  it('re-points at the resolved calendar when reconnecting the same account', async () => {
    const { calendarConnections, connect, apple } = setup()
    await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'password-1',
    })
    // The second connect resolves the same account but a different calendar.
    vi.mocked(apple.connectWithCredentials!).mockResolvedValueOnce({
      accountEmail: 'me@icloud.com',
      calendarId: 'https://dav/work/',
    })
    await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'password-2',
    })
    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(1)
    expect(stored[0]?.calendarId).toBe('https://dav/work/')
    expect(stored[0]?.accessToken).toBe('password-2')
  })

  it('does not default a second writable connection when one already exists', async () => {
    const { calendarConnections, connect, apple } = setup()
    await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'me@icloud.com',
      secret: 'password-1',
    })
    // A different account under the same writable provider.
    vi.mocked(apple.connectWithCredentials!).mockResolvedValueOnce({
      accountEmail: 'other@icloud.com',
      calendarId: 'https://dav/other/',
    })
    await connect(OWNER_ID, {
      provider: 'apple',
      accountEmail: 'other@icloud.com',
      secret: 'password-2',
    })
    const stored = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored).toHaveLength(2)
    expect(
      stored.find(c => c.accountEmail === 'me@icloud.com')?.isDefault,
    ).toBe(true)
    expect(
      stored.find(c => c.accountEmail === 'other@icloud.com')?.isDefault,
    ).toBe(false)
  })

  it('stores the adapter-resolved account email, not the typed one', async () => {
    const { calendarConnections, connect } = setup()
    // cal.com resolves the canonical email from its API, ignoring what was typed.
    await connect(OWNER_ID, {
      provider: 'calcom',
      accountEmail: 'typed@cal.com',
      secret: 'cal_live_key',
    })
    const [stored] = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored?.accountEmail).toBe('me@cal.com')
  })

  it('never makes a read-only provider the default', async () => {
    const { calendarConnections, connect } = setup()
    await connect(OWNER_ID, {
      provider: 'calcom',
      accountEmail: 'me@cal.com',
      secret: 'cal_live_key',
    })
    const [stored] = await calendarConnections.listByOwner(asEntityId(OWNER_ID))
    expect(stored?.provider).toBe('calcom')
    expect(stored?.isDefault).toBe(false)
  })

  it('rejects a provider that does not support credential connect', async () => {
    const { connect } = setup()
    await expect(
      connect(OWNER_ID, {
        provider: 'google',
        accountEmail: 'x@gmail.com',
        secret: 'nope',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
