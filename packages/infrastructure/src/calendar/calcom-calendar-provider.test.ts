import { afterEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '@lifedeck/domain'
import type { CalendarConnection } from '@lifedeck/domain'
import { CalcomCalendarProvider } from '@/calendar/calcom-calendar-provider'

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => payload,
  } as Response
}

// The adapter only reads accessToken off the connection.
const connection = { accessToken: 'cal_live_key' } as CalendarConnection

const provider = new CalcomCalendarProvider({
  apiBaseUrl: 'https://cal.test/v2',
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('CalcomCalendarProvider', () => {
  it('is read-only', () => {
    expect(provider.provider).toBe('calcom')
    expect(provider.writable).toBe(false)
  })

  it('validates the API key and returns the account on connect', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ data: { email: 'me@cal.com' } }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await provider.connectWithCredentials({
      accountEmail: 'typed@cal.com',
      secret: 'cal_live_key',
    })

    expect(result).toEqual({
      accountEmail: 'me@cal.com',
      calendarId: 'bookings',
    })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://cal.test/v2/me')
    expect(init.headers.authorization).toBe('Bearer cal_live_key')
    expect(init.headers['cal-api-version']).toBeDefined()
  })

  it('rejects a bad API key with a ValidationError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 401)))
    await expect(
      provider.connectWithCredentials({ accountEmail: 'x', secret: 'bad' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('maps bookings to external events and flags cancellations as deleted', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          {
            uid: 'bk-1',
            title: 'Intro call',
            start: '2026-07-20T15:00:00.000Z',
            end: '2026-07-20T15:30:00.000Z',
            status: 'accepted',
            updatedAt: '2026-07-19T10:00:00.000Z',
          },
          {
            uid: 'bk-2',
            title: 'Cancelled call',
            start: '2026-07-21T15:00:00.000Z',
            end: '2026-07-21T15:30:00.000Z',
            status: 'cancelled',
          },
          {
            uid: 'bk-4',
            title: 'Rejected call',
            start: '2026-07-22T15:00:00.000Z',
            end: '2026-07-22T15:30:00.000Z',
            status: 'rejected',
          },
          { title: 'malformed, no uid/times' },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const page = await provider.listChanges(connection)

    expect(page.nextSyncToken).toBeNull()
    expect(page.events).toHaveLength(3)
    expect(page.events[2]).toMatchObject({ externalId: 'bk-4', deleted: true })
    expect(page.events[0]).toMatchObject({
      externalId: 'bk-1',
      title: 'Intro call',
      allDay: false,
      deleted: false,
    })
    expect(page.events[1]).toMatchObject({ externalId: 'bk-2', deleted: true })
    expect(fetchMock.mock.calls[0]![0]).toBe(
      'https://cal.test/v2/bookings?take=100',
    )
  })

  it('handles alternate booking fields and untitled bookings', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          data: [
            {
              uid: 'bk-3',
              startTime: '2026-07-22T10:00:00.000Z',
              endTime: '2026-07-22T10:30:00.000Z',
            },
          ],
        }),
      ),
    )
    const page = await provider.listChanges(connection)
    expect(page.events[0]).toMatchObject({
      externalId: 'bk-3',
      title: '(no title)',
    })
  })

  it('surfaces a cal.com server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))
    await expect(provider.listChanges(connection)).rejects.toThrow()
  })

  it('rejects when no account email can be resolved', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: {} })),
    )
    await expect(
      provider.connectWithCredentials({ accountEmail: '', secret: 'cal_live' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('refuses writes and OAuth/watch operations', async () => {
    await expect(provider.pushEvent()).rejects.toThrow()
    await expect(provider.deleteEvent()).rejects.toThrow()
    await expect(provider.exchangeCode()).rejects.toThrow()
    await expect(provider.refreshAccessToken()).rejects.toThrow()
    await expect(provider.watch()).rejects.toThrow()
  })
})
