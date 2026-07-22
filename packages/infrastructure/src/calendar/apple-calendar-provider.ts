import { ValidationError } from '@lifedeck/domain'
import { httpFetch } from '@/http/http-fetch'
import type { CalendarConnection, CalendarEvent } from '@lifedeck/domain'
import type {
  CalendarProvider,
  CalendarSyncPage,
  CredentialConnectInput,
  CredentialConnectResult,
  ExternalCalendarEvent,
  OAuthTokens,
  RefreshedToken,
  WatchChannel,
} from '@lifedeck/application'
import { buildCalendar, parseCalendarEvents } from '@/calendar/ical'

const DEFAULT_CALDAV_BASE = 'https://caldav.icloud.com'
const NOT_SUPPORTED = 'Apple calendars do not support this operation.'

export type AppleCalendarConfig = {
  baseUrl?: string
}

// Namespace-agnostic extraction from a WebDAV/CalDAV XML body. A full XML
// parser would be sturdier, but the repo ships no XML dependency and the
// multistatus shapes we read are simple and well-scoped.
function tag(xml: string, name: string): string | null {
  const match = xml.match(
    new RegExp(
      `<(?:[\\w-]+:)?${name}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`,
      'i',
    ),
  )
  return match ? match[1]!.trim() : null
}

// A WebDAV text value with any XML entities resolved (hrefs, etags, and sync
// tokens can carry "&amp;" etc.).
function tagText(xml: string, name: string): string | null {
  const value = tag(xml, name)
  return value === null ? null : unescapeXml(value)
}

function firstHref(xml: string): string | null {
  return tagText(xml, 'href')
}

function responses(xml: string): string[] {
  return (
    xml.match(/<(?:[\w-]+:)?response\b[\s\S]*?<\/(?:[\w-]+:)?response>/gi) ?? []
  )
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

export class AppleCalendarProvider implements CalendarProvider {
  readonly provider = 'apple' as const

  constructor(private readonly config: AppleCalendarConfig = {}) {}

  private get base(): string {
    return this.config.baseUrl ?? DEFAULT_CALDAV_BASE
  }

  async connectWithCredentials(
    input: CredentialConnectInput,
  ): Promise<CredentialConnectResult> {
    const auth = basicAuth(input.accountEmail, input.secret)
    // 1) principal, 2) calendar home, 3) a calendar collection to sync.
    const principal = await this.propfind(
      this.base,
      auth,
      '0',
      '<d:current-user-principal/>',
    )
    const principalHref = firstHref(principal.body)
    if (!principalHref) {
      throw new ValidationError('Could not sign in to the Apple calendar.')
    }
    const principalUrl = absolute(principalHref, principal.url)

    const home = await this.propfind(
      principalUrl,
      auth,
      '0',
      '<c:calendar-home-set/>',
    )
    const homeHref = firstHref(tag(home.body, 'calendar-home-set') ?? home.body)
    if (!homeHref) {
      throw new ValidationError('Could not find the Apple calendar home.')
    }
    const homeUrl = absolute(homeHref, home.url)

    const collections = await this.propfind(
      homeUrl,
      auth,
      '1',
      '<d:resourcetype/><d:displayname/><c:supported-calendar-component-set/>',
    )
    const calendarHref = pickCalendar(collections.body)
    if (!calendarHref) {
      throw new ValidationError('No Apple calendar was found to sync.')
    }
    return {
      accountEmail: input.accountEmail,
      calendarId: absolute(calendarHref, collections.url),
    }
  }

  private authOf(connection: CalendarConnection): string {
    return basicAuth(connection.accountEmail ?? '', connection.accessToken)
  }

  async listChanges(connection: CalendarConnection): Promise<CalendarSyncPage> {
    const auth = this.authOf(connection)
    const body =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<d:sync-collection xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      `<d:sync-token>${connection.syncToken ?? ''}</d:sync-token>` +
      '<d:sync-level>1</d:sync-level>' +
      '<d:prop><d:getetag/><c:calendar-data/></d:prop>' +
      '</d:sync-collection>'
    const report = await this.request('REPORT', connection.calendarId, auth, {
      depth: '1',
      body,
    })
    const events: ExternalCalendarEvent[] = []
    for (const response of responses(report.body)) {
      const href = firstHref(response)
      if (!href) {
        continue
      }
      const externalId = absolute(href, report.url)
      // A response with no calendar-data (a 404 status) means the resource was
      // removed; emit a deletion keyed by its href.
      const data = tag(response, 'calendar-data')
      if (!data) {
        if (/<(?:[\w-]+:)?status>[^<]*\b404\b/i.test(response)) {
          events.push(deletedEvent(externalId))
        }
        continue
      }
      const etag = tagText(response, 'getetag')
      for (const parsed of parseCalendarEvents(unescapeXml(data))) {
        events.push(toExternalEvent(parsed, externalId, etag))
      }
    }
    return { events, nextSyncToken: tagText(report.body, 'sync-token') }
  }

  async pushEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<{ externalId: string; etag: string | null }> {
    const props = event.toJSON()
    const auth = this.authOf(connection)
    // An occurrence-override externalId is "<resourceHref>::<recurrenceId>";
    // the whole series lives in one resource, so write to the href, never the
    // composite key (which is not a valid CalDAV path).
    const existingHref = event.externalId
      ? event.externalId.split('::')[0]!
      : null
    // Reuse the resource URL for an already-synced event; otherwise mint one
    // from the stable event id under the calendar collection.
    const uid = props.id
    const resourceUrl =
      existingHref ?? absolute(`${uid}.ics`, ensureSlash(connection.calendarId))
    const ics = buildCalendar({
      uid,
      summary: props.title,
      description: props.description,
      location: props.location,
      startsAt: props.startsAt,
      endsAt: props.endsAt,
      allDay: props.allDay,
      recurrence: props.recurrence,
      dtstamp: props.updatedAt,
    })
    const response = await this.request('PUT', resourceUrl, auth, {
      body: ics,
      contentType: 'text/calendar; charset=utf-8',
      // A brand-new resource must not clobber an existing one at that path;
      // an update must only overwrite the version we last synced, so a
      // concurrent server-side edit isn't silently lost.
      ifNoneMatch: existingHref ? undefined : '*',
      ifMatch: existingHref && event.etag ? event.etag : undefined,
    })
    return { externalId: resourceUrl, etag: response.etag }
  }

  async deleteEvent(
    connection: CalendarConnection,
    externalId: string,
  ): Promise<void> {
    const auth = this.authOf(connection)
    await this.request('DELETE', externalId, auth, {})
  }

  async exchangeCode(): Promise<OAuthTokens> {
    throw new Error('Apple calendars connect with an app-specific password.')
  }

  async refreshAccessToken(): Promise<RefreshedToken> {
    throw new Error(NOT_SUPPORTED)
  }

  async watch(): Promise<WatchChannel> {
    // CalDAV has no push channels; the periodic reconcile sweep covers Apple.
    throw new Error(NOT_SUPPORTED)
  }

  private async propfind(
    url: string,
    auth: string,
    depth: string,
    prop: string,
  ): Promise<{ body: string; url: string }> {
    const body =
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">' +
      `<d:prop>${prop}</d:prop></d:propfind>`
    return this.request('PROPFIND', url, auth, { depth, body })
  }

  private async request(
    method: string,
    url: string,
    auth: string,
    options: {
      depth?: string
      body?: string
      contentType?: string
      ifMatch?: string
      ifNoneMatch?: string
    },
  ): Promise<{ body: string; url: string; etag: string | null }> {
    const headers: Record<string, string> = { authorization: auth }
    if (options.depth) {
      headers.depth = options.depth
    }
    if (options.ifMatch) {
      headers['if-match'] = options.ifMatch
    }
    if (options.ifNoneMatch) {
      headers['if-none-match'] = options.ifNoneMatch
    }
    if (options.body !== undefined) {
      headers['content-type'] =
        options.contentType ?? 'application/xml; charset=utf-8'
    }
    const response = await httpFetch(url, {
      method,
      headers,
      body: options.body,
    })
    if (response.status === 401 || response.status === 403) {
      throw new ValidationError('The Apple calendar credentials were rejected.')
    }
    if (!response.ok && response.status !== 404 && response.status !== 207) {
      throw new Error(`Apple CalDAV request failed (${response.status})`)
    }
    const text = response.status === 404 ? '' : await response.text()
    return {
      body: text,
      url: response.url || url,
      etag: response.headers.get('etag'),
    }
  }
}

function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`
}

function absolute(href: string, base: string): string {
  try {
    return new URL(href, base).toString()
  } catch {
    return href
  }
}

function ensureSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

function pickCalendar(xml: string): string | null {
  for (const response of responses(xml)) {
    const resourcetype = tag(response, 'resourcetype') ?? ''
    const supports = tag(response, 'supported-calendar-component-set') ?? ''
    const isCalendar = /calendar/i.test(resourcetype)
    // Prefer a collection that holds events; if no component set is advertised,
    // still accept a plain calendar collection.
    const holdsEvents = supports === '' || /VEVENT/i.test(supports)
    if (isCalendar && holdsEvents) {
      const href = firstHref(response)
      if (href) {
        return href
      }
    }
  }
  return null
}

function toExternalEvent(
  parsed: ReturnType<typeof parseCalendarEvents>[number],
  resourceHref: string,
  etag: string | null,
): ExternalCalendarEvent {
  const isOverride = parsed.recurrenceId !== null
  return {
    // A series master keys on its resource href; an occurrence override keys on
    // the resource + its recurrence id, linking back to the master.
    externalId: isOverride
      ? `${resourceHref}::${parsed.recurrenceId!.toISOString()}`
      : resourceHref,
    etag,
    title: parsed.summary,
    description: parsed.description,
    location: parsed.location,
    startsAt: parsed.startsAt,
    endsAt: parsed.endsAt,
    allDay: parsed.allDay,
    recurrence: parsed.recurrence,
    // CalDAV VALARM parsing is not wired yet, so Apple events carry no reminder
    // offsets. Google is the reminder-bearing source today.
    reminders: [],
    updatedAt: parsed.updatedAt,
    recurringEventExternalId: isOverride ? resourceHref : null,
    originalStartsAt: parsed.recurrenceId,
    cancelledOccurrence: isOverride && parsed.cancelled,
    deleted: parsed.cancelled && !isOverride,
  }
}

function deletedEvent(externalId: string): ExternalCalendarEvent {
  return {
    externalId,
    etag: null,
    title: '(deleted)',
    description: null,
    location: null,
    startsAt: new Date(0),
    endsAt: new Date(0),
    allDay: false,
    recurrence: null,
    reminders: [],
    updatedAt: new Date(0),
    recurringEventExternalId: null,
    originalStartsAt: null,
    cancelledOccurrence: false,
    deleted: true,
  }
}
