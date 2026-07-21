import { afterEach, describe, expect, it, vi } from 'vitest'
import { ValidationError } from '@lifedeck/domain'
import type { CalendarConnection, CalendarEvent } from '@lifedeck/domain'
import { AppleCalendarProvider } from '@/calendar/apple-calendar-provider'

function davResponse(
  body: string,
  opts: { status?: number; etag?: string; url?: string } = {},
): Response {
  const status = opts.status ?? 207
  return {
    ok: status < 400,
    status,
    url: opts.url ?? 'https://dav.test/',
    headers: {
      get: (h: string) =>
        h.toLowerCase() === 'etag' ? (opts.etag ?? null) : null,
    },
    text: async () => body,
  } as unknown as Response
}

const provider = new AppleCalendarProvider({ baseUrl: 'https://dav.test' })

const connection = {
  accountEmail: 'me@icloud.com',
  accessToken: 'app-specific-password',
  calendarId: 'https://dav.test/123/calendars/home/',
  syncToken: null,
} as CalendarConnection

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AppleCalendarProvider', () => {
  it('is a writable provider named apple', () => {
    expect(provider.provider).toBe('apple')
    // Apple omits the `writable` flag, so it is treated as writable (not false).
    expect((provider as { writable?: boolean }).writable).not.toBe(false)
  })

  it('discovers the account calendar via the PROPFIND chain', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/123/principal/</href><propstat><prop><current-user-principal><href>/123/principal/</href></current-user-principal></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/123/principal/</href><propstat><prop><C:calendar-home-set><href>/123/calendars/</href></C:calendar-home-set></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/123/calendars/home/</href><propstat><prop><resourcetype><collection/><C:calendar/></resourcetype><C:supported-calendar-component-set><C:comp name="VEVENT"/></C:supported-calendar-component-set></prop></propstat></response></multistatus>',
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await provider.connectWithCredentials({
      accountEmail: 'me@icloud.com',
      secret: 'app-specific-password',
    })

    expect(result.accountEmail).toBe('me@icloud.com')
    expect(result.calendarId).toBe('https://dav.test/123/calendars/home/')
    // First call is a PROPFIND with a Basic auth header.
    const [, init] = fetchMock.mock.calls[0]!
    expect(init.method).toBe('PROPFIND')
    expect(init.headers.authorization).toMatch(/^Basic /)
  })

  it('rejects bad credentials on connect', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(davResponse('', { status: 401 })),
    )
    await expect(
      provider.connectWithCredentials({ accountEmail: 'x', secret: 'bad' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('maps a sync-collection report into events and deletions', async () => {
    const ics =
      'BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:evt-1\nSUMMARY:Lunch\nDTSTART:20260720T150000Z\nDTEND:20260720T160000Z\nEND:VEVENT\nEND:VCALENDAR'
    const body =
      '<multistatus>' +
      `<response><href>/123/calendars/home/evt-1.ics</href><propstat><prop><getetag>"e1"</getetag><C:calendar-data>${ics}</C:calendar-data></prop><status>HTTP/1.1 200 OK</status></propstat></response>` +
      '<response><href>/123/calendars/home/gone.ics</href><status>HTTP/1.1 404 Not Found</status></response>' +
      // A response with no href is skipped entirely.
      '<response><propstat><prop><getetag>"skip"</getetag></prop></propstat></response>' +
      '<sync-token>http://dav.test/sync/2</sync-token>' +
      '</multistatus>'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))

    const page = await provider.listChanges(connection)

    expect(page.nextSyncToken).toBe('http://dav.test/sync/2')
    expect(page.events).toHaveLength(2)
    expect(page.events[0]).toMatchObject({
      externalId: 'https://dav.test/123/calendars/home/evt-1.ics',
      title: 'Lunch',
      etag: '"e1"',
      deleted: false,
    })
    expect(page.events[1]).toMatchObject({
      externalId: 'https://dav.test/123/calendars/home/gone.ics',
      deleted: true,
    })
  })

  it('PUTs an iCalendar document on push', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(davResponse('', { status: 201, etag: '"new"' }))
    vi.stubGlobal('fetch', fetchMock)
    const event = {
      externalId: null,
      toJSON: () => ({
        id: 'evt-1',
        title: 'Lunch',
        description: null,
        location: null,
        startsAt: new Date('2026-07-20T15:00:00.000Z'),
        endsAt: new Date('2026-07-20T16:00:00.000Z'),
        allDay: false,
        recurrence: null,
        updatedAt: new Date('2026-07-19T10:00:00.000Z'),
      }),
    } as unknown as CalendarEvent

    const result = await provider.pushEvent(connection, event)

    expect(result.externalId).toBe(
      'https://dav.test/123/calendars/home/evt-1.ics',
    )
    expect(result.etag).toBe('"new"')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://dav.test/123/calendars/home/evt-1.ics')
    expect(init.method).toBe('PUT')
    expect(init.body).toContain('BEGIN:VCALENDAR')
    expect(init.body).toContain('SUMMARY:Lunch')
    // A brand-new resource is created only if absent (no blind overwrite).
    expect(init.headers['if-none-match']).toBe('*')
    expect(init.headers['if-match']).toBeUndefined()
  })

  it('writes an override to its series resource with an If-Match guard', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(davResponse('', { status: 204, etag: '"e3"' }))
    vi.stubGlobal('fetch', fetchMock)
    const event = {
      // An occurrence-override externalId carries a "::recurrenceId" suffix; the
      // PUT must target the series resource href, never the composite key.
      externalId: 'https://dav.test/c/r1.ics::2026-07-27T09:00:00.000Z',
      etag: '"old"',
      toJSON: () => ({
        id: 'r1',
        title: 'Moved',
        description: null,
        location: null,
        startsAt: new Date('2026-07-27T10:00:00.000Z'),
        endsAt: new Date('2026-07-27T10:15:00.000Z'),
        allDay: false,
        recurrence: null,
        updatedAt: new Date('2026-07-19T10:00:00.000Z'),
      }),
    } as unknown as CalendarEvent

    const result = await provider.pushEvent(connection, event)

    expect(result.externalId).toBe('https://dav.test/c/r1.ics')
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://dav.test/c/r1.ics')
    // Only overwrite the version we last synced.
    expect(init.headers['if-match']).toBe('"old"')
    expect(init.headers['if-none-match']).toBeUndefined()
  })

  it('maps an occurrence override to a linked event', async () => {
    const ics =
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:r1\nSUMMARY:Moved\nRECURRENCE-ID:20260727T090000Z\nDTSTART:20260727T100000Z\nDTEND:20260727T101500Z\nEND:VEVENT\nEND:VCALENDAR'
    const body = `<multistatus><response><href>/c/r1.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>${ics}</C:calendar-data></prop></propstat></response><sync-token>t</sync-token></multistatus>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))
    const page = await provider.listChanges(connection)
    expect(page.events[0]).toMatchObject({
      recurringEventExternalId: 'https://dav.test/c/r1.ics',
    })
    expect(page.events[0]?.externalId).toContain('::')
  })

  it('maps a cancelled series master to a deletion', async () => {
    const ics =
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:c1\nSUMMARY:Cancelled\nDTSTART:20260720T150000Z\nDTEND:20260720T160000Z\nSTATUS:CANCELLED\nEND:VEVENT\nEND:VCALENDAR'
    const body = `<multistatus><response><href>/c/c1.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>${ics}</C:calendar-data></prop></propstat></response><sync-token>t</sync-token></multistatus>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))
    const page = await provider.listChanges(connection)
    expect(page.events[0]).toMatchObject({
      deleted: true,
      cancelledOccurrence: false,
    })
  })

  it('maps a cancelled occurrence override to a cancelled occurrence', async () => {
    const ics =
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:r1\nSUMMARY:Skip\nRECURRENCE-ID:20260727T090000Z\nDTSTART:20260727T100000Z\nDTEND:20260727T101500Z\nSTATUS:CANCELLED\nEND:VEVENT\nEND:VCALENDAR'
    const body = `<multistatus><response><href>/c/r1.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>${ics}</C:calendar-data></prop></propstat></response><sync-token>t</sync-token></multistatus>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))
    const page = await provider.listChanges(connection)
    // A cancelled single occurrence removes that instance, not the whole series.
    expect(page.events[0]).toMatchObject({
      cancelledOccurrence: true,
      deleted: false,
    })
  })

  it('unescapes XML entities in the sync token', async () => {
    const ics =
      'BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:e\nSUMMARY:E\nDTSTART:20260720T150000Z\nDTEND:20260720T160000Z\nEND:VEVENT\nEND:VCALENDAR'
    const body = `<multistatus><response><href>/c/e.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>${ics}</C:calendar-data></prop></propstat></response><sync-token>tok&amp;2</sync-token></multistatus>`
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))
    const page = await provider.listChanges(connection)
    expect(page.nextSyncToken).toBe('tok&2')
  })

  it('surfaces a server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(davResponse('err', { status: 500 })),
    )
    await expect(provider.listChanges(connection)).rejects.toThrow()
  })

  it('reuses the resource url for an already-synced event', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(davResponse('', { status: 204, etag: '"e2"' }))
    vi.stubGlobal('fetch', fetchMock)
    const event = {
      externalId: 'https://dav.test/c/existing.ics',
      toJSON: () => ({
        id: 'x',
        title: 'T',
        description: null,
        location: null,
        startsAt: new Date('2026-07-20T15:00:00.000Z'),
        endsAt: new Date('2026-07-20T16:00:00.000Z'),
        allDay: false,
        recurrence: null,
        updatedAt: new Date('2026-07-19T10:00:00.000Z'),
      }),
    } as unknown as CalendarEvent
    const result = await provider.pushEvent(connection, event)
    expect(result.externalId).toBe('https://dav.test/c/existing.ics')
    expect(fetchMock.mock.calls[0]![0]).toBe('https://dav.test/c/existing.ics')
  })

  it('rejects when discovery finds no principal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(davResponse('<multistatus></multistatus>')),
    )
    await expect(
      provider.connectWithCredentials({ accountEmail: 'x', secret: 'y' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('DELETEs the resource on delete', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(davResponse('', { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await provider.deleteEvent(
      connection,
      'https://dav.test/123/calendars/home/evt-1.ics',
    )
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('https://dav.test/123/calendars/home/evt-1.ics')
    expect(init.method).toBe('DELETE')
  })

  it('keeps a relative href when the base url is unavailable', async () => {
    const body =
      '<multistatus><response><href>/rel/e.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:e\nSUMMARY:E\nDTSTART:20260720T150000Z\nDTEND:20260720T160000Z\nEND:VEVENT\nEND:VCALENDAR</C:calendar-data></prop></propstat></response></multistatus>'
    // Both the response url and the request url resolve empty, so the href
    // cannot be made absolute and is kept as-is.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(davResponse(body, { url: '' })),
    )
    const anon = { ...connection, calendarId: '' } as CalendarConnection
    const page = await provider.listChanges(anon)
    expect(page.events[0]?.externalId).toBe('/rel/e.ics')
  })

  it('skips non-calendar collections and accepts one with no component set', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/123/principal/</href><propstat><prop><current-user-principal><href>/123/principal/</href></current-user-principal></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><propstat><prop><C:calendar-home-set><href>/123/calendars/</href></C:calendar-home-set></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus>' +
            '<response><href>/123/inbox/</href><propstat><prop><resourcetype><collection/></resourcetype></prop></propstat></response>' +
            '<response><href>/123/calendars/work/</href><propstat><prop><resourcetype><collection/><C:calendar/></resourcetype></prop></propstat></response>' +
            '</multistatus>',
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    const result = await provider.connectWithCredentials({
      accountEmail: 'me@icloud.com',
      secret: 'pw',
    })
    expect(result.calendarId).toBe('https://dav.test/123/calendars/work/')
  })

  it('rejects when the account has no calendar collection', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/p/</href><propstat><prop><current-user-principal><href>/p/</href></current-user-principal></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><propstat><prop><C:calendar-home-set><href>/h/</href></C:calendar-home-set></prop></propstat></response></multistatus>',
        ),
      )
      .mockResolvedValueOnce(
        davResponse(
          '<multistatus><response><href>/h/inbox/</href><propstat><prop><resourcetype><collection/></resourcetype></prop></propstat></response></multistatus>',
        ),
      )
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      provider.connectWithCredentials({ accountEmail: 'x', secret: 'y' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('treats a 404 on delete as already gone', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(davResponse('', { status: 404 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      provider.deleteEvent(connection, 'https://dav.test/c/x.ics'),
    ).resolves.toBeUndefined()
  })

  it('signs in even when the connection has no stored account email', async () => {
    const body =
      '<multistatus><response><href>/c/e.ics</href><propstat><prop><getetag>"e"</getetag><C:calendar-data>BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:e\nSUMMARY:E\nDTSTART:20260720T150000Z\nDTEND:20260720T160000Z\nEND:VEVENT\nEND:VCALENDAR</C:calendar-data></prop></propstat></response></multistatus>'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(davResponse(body)))
    const anon = { ...connection, accountEmail: null } as CalendarConnection
    const page = await provider.listChanges(anon)
    expect(page.events).toHaveLength(1)
  })

  it('does not support OAuth or push channels', async () => {
    await expect(provider.exchangeCode()).rejects.toThrow()
    await expect(provider.refreshAccessToken()).rejects.toThrow()
    await expect(provider.watch()).rejects.toThrow()
  })
})
