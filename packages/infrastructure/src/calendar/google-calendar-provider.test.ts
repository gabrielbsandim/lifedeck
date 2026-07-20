import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CalendarConnection, CalendarEvent, asEntityId } from '@lifedeck/domain'
import type { CalendarConnectionProps } from '@lifedeck/domain'
import { GoogleCalendarProvider } from '@/calendar/google-calendar-provider'

const CONFIG = {
  clientId: 'client-123',
  clientSecret: 'secret-abc',
  redirectUri: 'https://app.test/callback',
}

const NOW = new Date('2026-07-20T12:00:00.000Z')

function provider() {
  return new GoogleCalendarProvider(CONFIG)
}

function jsonResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  }
}

function connection(
  overrides: Partial<CalendarConnectionProps> = {},
): CalendarConnection {
  return CalendarConnection.restore({
    id: asEntityId('11111111-0000-4000-8000-000000000001'),
    ownerId: asEntityId('11111111-0000-4000-8000-0000000000a1'),
    provider: 'google',
    accountEmail: 'gabriel@example.com',
    isDefault: true,
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    tokenExpiresAt: NOW,
    calendarId: 'primary',
    syncToken: null,
    channelId: null,
    resourceId: null,
    channelExpiresAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  })
}

function localEvent(
  overrides: Partial<Parameters<typeof CalendarEvent.create>[0]> = {},
): CalendarEvent {
  return CalendarEvent.create({
    id: asEntityId('22222222-0000-4000-8000-000000000001'),
    ownerId: asEntityId('11111111-0000-4000-8000-0000000000a1'),
    title: 'Lunch',
    startsAt: new Date('2026-07-21T12:00:00.000Z'),
    endsAt: new Date('2026-07-21T13:00:00.000Z'),
    now: NOW,
    ...overrides,
  })
}

// Builds a JWT-shaped id_token whose payload carries the given claims. The
// signature segment is irrelevant: the adapter reads the claim without
// verifying it, so any placeholder works.
function idToken(claims: Record<string, unknown>): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `header.${payload}.signature`
}

// A minimal Google event that individual tests override field by field.
function googleEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-1',
    etag: '"etag-1"',
    status: 'confirmed',
    summary: 'Standup',
    description: 'Daily sync',
    location: 'Zoom',
    start: { dateTime: '2026-07-21T09:00:00.000Z' },
    end: { dateTime: '2026-07-21T09:15:00.000Z' },
    updated: '2026-07-20T08:00:00.000Z',
    ...overrides,
  }
}

let fetchMock: ReturnType<typeof vi.fn>

// The [url, init] tuple passed to the nth fetch call.
function call(index: number): [string, { method?: string; body?: string }] {
  return fetchMock.mock.calls[index]! as [
    string,
    { method?: string; body?: string },
  ]
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN
})

describe('GoogleCalendarProvider', () => {
  it('exposes the google provider name', () => {
    expect(provider().provider).toBe('google')
  })

  describe('authUrl', () => {
    it('builds a consent URL with the narrow events scope and state', () => {
      const url = new URL(provider().authUrl('state-xyz'))
      expect(url.origin + url.pathname).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth',
      )
      expect(url.searchParams.get('client_id')).toBe('client-123')
      expect(url.searchParams.get('redirect_uri')).toBe(CONFIG.redirectUri)
      expect(url.searchParams.get('state')).toBe('state-xyz')
      expect(url.searchParams.get('scope')).toContain('calendar.events')
      expect(url.searchParams.get('access_type')).toBe('offline')
      expect(url.searchParams.get('prompt')).toBe('consent select_account')
    })
  })

  describe('exchangeCode', () => {
    it('maps the token response and reads the account email from the id_token', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 1800,
          id_token: idToken({ email: 'gabriel@example.com' }),
        }),
      )
      const tokens = await provider().exchangeCode('code-1', CONFIG.redirectUri)
      expect(tokens.accessToken).toBe('new-access')
      expect(tokens.refreshToken).toBe('new-refresh')
      expect(tokens.accountEmail).toBe('gabriel@example.com')
      expect(tokens.expiresAt.getTime()).toBeGreaterThan(Date.now())

      expect(call(0)[0]).toBe('https://oauth2.googleapis.com/token')
      expect(call(0)[1].method).toBe('POST')
    })

    it('defaults expiry and empty refresh token when Google omits them', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: 'a', id_token: idToken({}) }),
      )
      const tokens = await provider().exchangeCode('code', CONFIG.redirectUri)
      expect(tokens.refreshToken).toBe('')
      expect(tokens.accountEmail).toBeNull()
    })

    it('returns a null email when the id_token is missing a payload segment', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: 'a', id_token: 'not-a-jwt' }),
      )
      const tokens = await provider().exchangeCode('code', CONFIG.redirectUri)
      expect(tokens.accountEmail).toBeNull()
    })

    it('returns a null email when the id_token is absent', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ access_token: 'a' }))
      const tokens = await provider().exchangeCode('code', CONFIG.redirectUri)
      expect(tokens.accountEmail).toBeNull()
    })

    it('returns a null email when the id_token payload is not valid JSON', async () => {
      // "YWJj" base64url-decodes to "abc", which JSON.parse rejects.
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: 'a', id_token: 'header.YWJj.sig' }),
      )
      const tokens = await provider().exchangeCode('code', CONFIG.redirectUri)
      expect(tokens.accountEmail).toBeNull()
    })

    it('throws when the token endpoint fails', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 400))
      await expect(
        provider().exchangeCode('code', CONFIG.redirectUri),
      ).rejects.toThrow('Google token request failed (400)')
    })
  })

  describe('refreshAccessToken', () => {
    it('exchanges a refresh token for a new access token', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: 'refreshed', expires_in: 3600 }),
      )
      const result = await provider().refreshAccessToken('refresh-token')
      expect(result.accessToken).toBe('refreshed')
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('defaults the expiry when Google omits expires_in', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ access_token: 'refreshed' }),
      )
      const result = await provider().refreshAccessToken('refresh-token')
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('listChanges', () => {
    it('maps a timed event, an all-day event, and a no-title fallback', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [
            googleEvent(),
            googleEvent({
              id: 'evt-allday',
              summary: '  Trip  ',
              start: { date: '2026-08-01' },
              end: { date: '2026-08-02' },
            }),
            googleEvent({ id: 'evt-untitled', summary: '   ' }),
          ],
          nextSyncToken: 'sync-next',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.nextSyncToken).toBe('sync-next')
      expect(page.events[0]).toMatchObject({
        externalId: 'evt-1',
        title: 'Standup',
        allDay: false,
        deleted: false,
      })
      expect(page.events[1]).toMatchObject({ allDay: true, title: 'Trip' })
      expect(page.events[2]?.title).toBe('(no title)')
    })

    it('maps a recurring master into a recurrence rule', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [
            googleEvent({
              id: 'evt-series',
              recurrence: ['RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE'],
            }),
          ],
          nextSyncToken: 'sync-1',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.events[0]?.recurrence).toMatchObject({
        freq: 'weekly',
        interval: 1,
      })
      expect(page.events[0]?.recurringEventExternalId).toBeNull()
    })

    it('stores an edited occurrence as an override, never recurring', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [
            googleEvent({
              id: 'evt-series_20260721T090000Z',
              recurringEventId: 'evt-series',
              originalStartTime: { dateTime: '2026-07-21T09:00:00.000Z' },
              recurrence: ['RRULE:FREQ=WEEKLY;INTERVAL=1'],
            }),
          ],
          nextSyncToken: 'sync-1',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.events[0]?.recurringEventExternalId).toBe('evt-series')
      expect(page.events[0]?.recurrence).toBeNull()
      expect(page.events[0]?.originalStartsAt).toEqual(
        new Date('2026-07-21T09:00:00.000Z'),
      )
    })

    it('marks a cancelled top-level event as deleted', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [googleEvent({ status: 'cancelled' })],
          nextSyncToken: 'sync-1',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.events[0]?.deleted).toBe(true)
      expect(page.events[0]?.cancelledOccurrence).toBe(false)
    })

    it('marks a cancelled occurrence as an override, not a deletion', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: 'evt-series_20260721T090000Z',
              status: 'cancelled',
              recurringEventId: 'evt-series',
              originalStartTime: { dateTime: '2026-07-21T09:00:00.000Z' },
            },
          ],
          nextSyncToken: 'sync-1',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.events[0]?.cancelledOccurrence).toBe(true)
      expect(page.events[0]?.deleted).toBe(false)
      // Cancelled instances carry no start; the original start keeps the window.
      expect(page.events[0]?.startsAt).toEqual(
        new Date('2026-07-21T09:00:00.000Z'),
      )
    })

    it('follows pagination across pages', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            items: [googleEvent({ id: 'p1' })],
            nextPageToken: 'page-2',
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            items: [googleEvent({ id: 'p2' })],
            nextSyncToken: 'sync-final',
          }),
        )
      const page = await provider().listChanges(connection())
      expect(page.events.map(e => e.externalId)).toEqual(['p1', 'p2'])
      expect(page.nextSyncToken).toBe('sync-final')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('sends the stored sync token when present', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ items: [], nextSyncToken: 'sync-2' }),
      )
      await provider().listChanges(connection({ syncToken: 'stored-token' }))
      expect(String(call(0)[0])).toContain('syncToken=stored-token')
    })

    it('falls back to a clean full resync when the stored token is rejected', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse({}, 410))
        .mockResolvedValueOnce(
          jsonResponse({ items: [googleEvent()], nextSyncToken: 'fresh' }),
        )
      const page = await provider().listChanges(
        connection({ syncToken: 'stale-token' }),
      )
      expect(page.nextSyncToken).toBe('fresh')
      expect(String(call(1)[0])).toContain('timeMin=')
    })

    it('rethrows a first-sync failure when there is no stored token', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 500))
      await expect(provider().listChanges(connection())).rejects.toThrow(
        'Google Calendar request failed (500)',
      )
    })

    it('falls back to the epoch when a non-occurrence event has no start', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          items: [{ id: 'evt-empty', status: 'confirmed' }],
          nextSyncToken: 'sync-1',
        }),
      )
      const page = await provider().listChanges(connection())
      expect(page.events[0]?.startsAt).toEqual(new Date(0))
      expect(page.events[0]?.endsAt).toEqual(new Date(0))
    })
  })

  describe('pushEvent', () => {
    it('POSTs a brand new event and returns its external id + etag', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 'remote-1', etag: '"e"' }),
      )
      const result = await provider().pushEvent(connection(), localEvent())
      expect(result).toEqual({ externalId: 'remote-1', etag: '"e"' })
      expect(call(0)[1].method).toBe('POST')
      expect(String(call(0)[0])).toContain('/calendars/primary/events')
      expect(JSON.parse(call(0)[1].body ?? '{}')).toMatchObject({
        summary: 'Lunch',
      })
    })

    it('PATCHes an event that already has an external id', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 'remote-1', etag: '"e2"' }),
      )
      await provider().pushEvent(
        connection(),
        localEvent({ externalId: 'remote-1' }),
      )
      expect(call(0)[1].method).toBe('PATCH')
    })

    it('serializes an all-day event with date-only slots and a recurrence', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'r', etag: null }))
      await provider().pushEvent(
        connection(),
        localEvent({
          allDay: true,
          recurrence: { freq: 'weekly', interval: 1, startDate: '2026-07-21' },
        }),
      )
      const body = JSON.parse(call(0)[1].body ?? '{}')
      expect(body.start).toEqual({ date: '2026-07-21' })
      expect(body.recurrence[0]).toContain('FREQ=WEEKLY')
    })

    it('PATCHes a moved occurrence override by its instance id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'inst', etag: '"e"' }))
      await provider().pushEvent(
        connection(),
        localEvent({
          recurrenceMasterExternalId: 'master-1',
          originalStartsAt: new Date('2026-07-21T09:00:00.000Z'),
        }),
      )
      expect(call(0)[1].method).toBe('PATCH')
      expect(String(call(0)[0])).toContain('master-1_20260721T090000Z')
      expect(JSON.parse(call(0)[1].body ?? '{}')).toMatchObject({
        summary: 'Lunch',
      })
    })

    it('builds an all-day occurrence instance id from the date stamp', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'inst', etag: null }))
      await provider().pushEvent(
        connection(),
        localEvent({
          allDay: true,
          startsAt: new Date('2026-07-21T00:00:00.000Z'),
          endsAt: new Date('2026-07-22T00:00:00.000Z'),
          recurrenceMasterExternalId: 'master-1',
          originalStartsAt: new Date('2026-07-21T00:00:00.000Z'),
        }),
      )
      expect(String(call(0)[0])).toContain('master-1_20260721')
    })

    it('cancels an occurrence override with a status body', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ id: 'inst', etag: null }))
      await provider().pushEvent(
        connection(),
        localEvent({
          cancelled: true,
          recurrenceMasterExternalId: 'master-1',
          originalStartsAt: new Date('2026-07-21T09:00:00.000Z'),
        }),
      )
      expect(JSON.parse(call(0)[1].body ?? '{}')).toEqual({
        status: 'cancelled',
      })
    })
  })

  describe('deleteEvent', () => {
    it('issues a DELETE for the external id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 204))
      await provider().deleteEvent(connection(), 'remote-1')
      expect(call(0)[1].method).toBe('DELETE')
      expect(String(call(0)[0])).toContain('/events/remote-1')
    })

    it('treats a 404 on delete as already gone', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 404))
      await expect(
        provider().deleteEvent(connection(), 'missing'),
      ).resolves.toBeUndefined()
    })

    it('throws on an unexpected delete failure', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({}, 500))
      await expect(
        provider().deleteEvent(connection(), 'remote-1'),
      ).rejects.toThrow('Google Calendar request failed (500)')
    })
  })

  describe('watch', () => {
    it('registers a push channel and maps its identifiers', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({
          id: 'channel-1',
          resourceId: 'resource-1',
          expiration: '1800000000000',
        }),
      )
      const channel = await provider().watch(
        connection(),
        'https://app.test/webhooks/google',
      )
      expect(channel.channelId).toBe('channel-1')
      expect(channel.resourceId).toBe('resource-1')
      expect(channel.expiresAt).toEqual(new Date(1800000000000))
      const body = JSON.parse(call(0)[1].body ?? '{}')
      expect(body.type).toBe('web_hook')
      expect(body.address).toBe('https://app.test/webhooks/google')
      expect(body.token).toBeUndefined()
    })

    it('includes the verification token when configured', async () => {
      process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN = 'verify-me'
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 'c', resourceId: 'r' }),
      )
      await provider().watch(connection(), 'https://app.test/hook')
      expect(JSON.parse(call(0)[1].body ?? '{}').token).toBe('verify-me')
    })

    it('leaves expiresAt null when Google omits an expiration', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse({ id: 'c', resourceId: 'r' }),
      )
      const channel = await provider().watch(connection(), 'https://app.test/h')
      expect(channel.expiresAt).toBeNull()
    })
  })
})
