import { ValidationError } from '@lifedeck/domain'
import { httpFetch } from '@/http/http-fetch'
import type { CalendarConnection } from '@lifedeck/domain'
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

const DEFAULT_API_BASE = 'https://api.cal.com/v2'
// cal.com's v2 API pins behaviour to a dated version header.
const API_VERSION = '2024-08-13'
const READ_ONLY = 'cal.com calendars are read-only.'

export type CalcomCalendarConfig = {
  apiBaseUrl?: string
}

type CalcomBooking = {
  uid?: string
  id?: number
  title?: string
  description?: string | null
  location?: string | null
  start?: string
  startTime?: string
  end?: string
  endTime?: string
  status?: string
  updatedAt?: string
}

function pick(...values: (string | undefined)[]): string | undefined {
  return values.find(value => typeof value === 'string' && value !== '')
}

function toExternalEvent(booking: CalcomBooking): ExternalCalendarEvent | null {
  const externalId = pick(
    booking.uid,
    booking.id ? String(booking.id) : undefined,
  )
  const start = pick(booking.start, booking.startTime)
  const end = pick(booking.end, booking.endTime)
  if (!externalId || !start || !end) {
    return null
  }
  const startsAt = new Date(start)
  const cancelled =
    booking.status === 'cancelled' || booking.status === 'rejected'
  return {
    externalId,
    etag: null,
    title: booking.title?.trim() || '(no title)',
    description: booking.description ?? null,
    location: booking.location ?? null,
    startsAt,
    endsAt: new Date(end),
    allDay: false,
    // Bookings are single meetings, never an RRULE series.
    recurrence: null,
    updatedAt: new Date(booking.updatedAt ?? start),
    recurringEventExternalId: null,
    originalStartsAt: null,
    cancelledOccurrence: false,
    // A cancelled/rejected booking removes its imported row.
    deleted: cancelled,
  }
}

// Read-only import of a user's cal.com bookings as calendar events. cal.com's
// model is bookings (scheduled meetings), not a general event store, so nothing
// is ever written back; `writable = false` makes the push/delete use cases skip
// it, and the write methods are never reached.
export class CalcomCalendarProvider implements CalendarProvider {
  readonly provider = 'calcom' as const
  readonly writable = false

  constructor(private readonly config: CalcomCalendarConfig = {}) {}

  private get base(): string {
    return this.config.apiBaseUrl ?? DEFAULT_API_BASE
  }

  async connectWithCredentials(
    input: CredentialConnectInput,
  ): Promise<CredentialConnectResult> {
    const me = await this.api<{ data?: { email?: string; username?: string } }>(
      'GET',
      '/me',
      input.secret,
    )
    const accountEmail = pick(me.data?.email, input.accountEmail) ?? null
    if (accountEmail === null) {
      throw new ValidationError('Could not read the cal.com account email.')
    }
    return { accountEmail, calendarId: 'bookings' }
  }

  async listChanges(connection: CalendarConnection): Promise<CalendarSyncPage> {
    // No incremental cursor: re-list the bookings each sweep. Dedup upstream is
    // by externalId + last-writer-wins, so a full list is idempotent.
    const result = await this.api<{ data?: CalcomBooking[] }>(
      'GET',
      '/bookings?take=100',
      connection.accessToken,
    )
    const events: ExternalCalendarEvent[] = []
    for (const booking of result.data ?? []) {
      const event = toExternalEvent(booking)
      if (event) {
        events.push(event)
      }
    }
    return { events, nextSyncToken: null }
  }

  // Read-only: the following are never invoked (writable === false), and OAuth /
  // watch do not apply to an API-key provider.
  async pushEvent(): Promise<{ externalId: string; etag: string | null }> {
    throw new Error(READ_ONLY)
  }

  async deleteEvent(): Promise<void> {
    throw new Error(READ_ONLY)
  }

  async exchangeCode(): Promise<OAuthTokens> {
    throw new Error('cal.com connects with an API key, not OAuth.')
  }

  async refreshAccessToken(): Promise<RefreshedToken> {
    throw new Error('cal.com API keys do not expire.')
  }

  async watch(): Promise<WatchChannel> {
    throw new Error('cal.com does not support push channels.')
  }

  private async api<T>(
    method: string,
    path: string,
    apiKey: string,
    body?: unknown,
  ): Promise<T> {
    const response = await httpFetch(`${this.base}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'cal-api-version': API_VERSION,
        'content-type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (response.status === 401 || response.status === 403) {
      throw new ValidationError('The cal.com API key was rejected.')
    }
    if (!response.ok) {
      throw new Error(`cal.com request failed (${response.status})`)
    }
    return response.json() as Promise<T>
  }
}
