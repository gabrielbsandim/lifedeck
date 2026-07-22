import { randomUUID } from 'node:crypto'
import { httpFetch } from '@/http/http-fetch'
import type { CalendarConnection, CalendarEvent } from '@lifedeck/domain'
import type {
  CalendarProvider,
  CalendarSyncPage,
  ExternalCalendarEvent,
  OAuthTokens,
  RefreshedToken,
  WatchChannel,
} from '@lifedeck/application'
import { fromGoogleRecurrence, toGoogleRecurrence } from '@/calendar/rrule'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
// Minimal Calendar access: read and write events on the calendars the user can
// reach (we only ever sync events on their `primary` calendar; we never create,
// delete, or reshare calendars, nor list their other calendars). Requesting the
// narrow `calendar.events` scope instead of full `calendar` keeps us in Google's
// "sensitive" tier and makes OAuth verification easier to justify. `openid email`
// identifies the Google account so we can label and de-duplicate connections.
const CALENDAR_SCOPE =
  'https://www.googleapis.com/auth/calendar.events openid email'
const INITIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000

export type GoogleCalendarConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

type GoogleSlot = { dateTime?: string; date?: string }

type GoogleEvent = {
  id: string
  etag?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  start?: GoogleSlot
  end?: GoogleSlot
  updated?: string
  recurrence?: string[]
  recurringEventId?: string
  originalStartTime?: GoogleSlot
  reminders?: { useDefault?: boolean; overrides?: GoogleReminder[] }
}

type GoogleReminder = { method?: string; minutes?: number }

// The most reminders the domain accepts per event; Google can in theory list
// more, so cap before handing them over to avoid a validation throw.
const MAX_REMINDERS = 5

// Fold Google's reminder settings into plain minutes-before offsets: explicit
// overrides win, otherwise the calendar's defaults apply when `useDefault` is
// set. The delivery method (popup/email) is irrelevant here, we own the channel,
// so distinct methods at the same minute collapse to one offset.
function mapReminders(
  reminders: GoogleEvent['reminders'],
  defaults: GoogleReminder[],
): number[] {
  if (!reminders) {
    return []
  }
  const source =
    reminders.overrides && reminders.overrides.length > 0
      ? reminders.overrides
      : reminders.useDefault
        ? defaults
        : []
  const minutes = source
    .map(entry => entry.minutes)
    .filter((value): value is number => typeof value === 'number' && value >= 0)
  return [...new Set(minutes)].sort((a, b) => a - b).slice(0, MAX_REMINDERS)
}

function parseSlot(slot: GoogleSlot | undefined): Date | null {
  if (slot?.dateTime) {
    return new Date(slot.dateTime)
  }
  if (slot?.date) {
    return new Date(`${slot.date}T00:00:00.000Z`)
  }
  return null
}

function toExternalEvent(
  item: GoogleEvent,
  defaultReminders: GoogleReminder[],
): ExternalCalendarEvent {
  const originalStartsAt = parseSlot(item.originalStartTime)
  const isOccurrence = Boolean(item.recurringEventId)
  // A cancelled single instance arrives without start/end, so fall back to its
  // original start to keep the row's window sane.
  const startsAt =
    parseSlot(item.start) ??
    (isOccurrence ? originalStartsAt : null) ??
    new Date(0)
  const endsAt = parseSlot(item.end) ?? startsAt
  const cancelled = item.status === 'cancelled'
  return {
    externalId: item.id,
    etag: item.etag ?? null,
    title: item.summary?.trim() || '(no title)',
    description: item.description ?? null,
    location: item.location ?? null,
    startsAt,
    endsAt,
    allDay: Boolean(item.start?.date ?? item.originalStartTime?.date),
    // An occurrence override is a single instance, never itself recurring.
    recurrence: isOccurrence
      ? null
      : fromGoogleRecurrence(
          item.recurrence,
          startsAt.toISOString().slice(0, 10),
        ),
    reminders: mapReminders(item.reminders, defaultReminders),
    updatedAt: item.updated ? new Date(item.updated) : new Date(0),
    recurringEventExternalId: item.recurringEventId ?? null,
    originalStartsAt,
    cancelledOccurrence: isOccurrence && cancelled,
    // Only a cancelled top-level event deletes its row; a cancelled instance is
    // kept as an override so expansion can hide that single occurrence.
    deleted: cancelled && !isOccurrence,
  }
}

// The id_token is a JWT whose payload carries the account email. We received it
// straight from Google's token endpoint over TLS, so we read the claim without
// re-verifying the signature (it is used only as a display label / dedup key).
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) {
    return null
  }
  const payload = idToken.split('.')[1]
  if (!payload) {
    return null
  }
  try {
    const json = Buffer.from(payload, 'base64url').toString('utf8')
    const claims = JSON.parse(json) as { email?: unknown }
    return typeof claims.email === 'string' ? claims.email : null
  } catch {
    return null
  }
}

// Google identifies a single instance of a recurring series as
// `${masterId}_${originalStart}` where the timestamp is the occurrence's
// original start in UTC basic format (YYYYMMDDTHHMMSSZ, or YYYYMMDD all-day).
function instanceIdFor(
  masterExternalId: string,
  originalStartsAt: Date,
  allDay: boolean,
): string {
  const iso = originalStartsAt.toISOString()
  const stamp = allDay
    ? iso.slice(0, 10).replace(/-/g, '')
    : `${iso.slice(0, 19).replace(/[-:]/g, '')}Z`
  return `${masterExternalId}_${stamp}`
}

function slotFor(event: CalendarEvent): { start: GoogleSlot; end: GoogleSlot } {
  const props = event.toJSON()
  if (props.allDay) {
    return {
      start: { date: props.startsAt.toISOString().slice(0, 10) },
      end: { date: props.endsAt.toISOString().slice(0, 10) },
    }
  }
  return {
    start: { dateTime: props.startsAt.toISOString() },
    end: { dateTime: props.endsAt.toISOString() },
  }
}

export class GoogleCalendarProvider implements CalendarProvider {
  readonly provider = 'google' as const

  constructor(private readonly config: GoogleCalendarConfig) {}

  authUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: 'code',
      scope: CALENDAR_SCOPE,
      state,
      access_type: 'offline',
      // select_account lets the user pick which Google account to add, so a
      // second (work) connection does not silently reuse the first account.
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
    })
    return `${AUTH_ENDPOINT}?${params.toString()}`
  }

  async exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens> {
    const token = await this.token({
      code,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    })
    return {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? '',
      expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
      accountEmail: emailFromIdToken(token.id_token),
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<RefreshedToken> {
    const token = await this.token({
      refresh_token: refreshToken,
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: 'refresh_token',
    })
    return {
      accessToken: token.access_token,
      expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000),
    }
  }

  async listChanges(connection: CalendarConnection): Promise<CalendarSyncPage> {
    const syncToken = connection.syncToken
    try {
      return await this.collect(connection, syncToken)
    } catch (error) {
      // A stored token can fail because it expired (410 Gone) or because it was
      // created with different query parameters (400), which happens the first
      // time we sync after switching to non-expanded events for recurrence. Any
      // failure with a stored token is recoverable with one clean full resync.
      if (syncToken) {
        return this.collect(connection, null)
      }
      throw error
    }
  }

  async pushEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<{ externalId: string; etag: string | null }> {
    const props = event.toJSON()

    // Occurrence override: PATCH the specific instance of the series. The
    // instance already exists implicitly in Google, so we never POST; we target
    // it by its instance id (masterId + original start in UTC basic form) and
    // either cancel it or write the moved/edited fields.
    if (props.recurrenceMasterExternalId && props.originalStartsAt) {
      const instanceId =
        event.externalId ??
        instanceIdFor(
          props.recurrenceMasterExternalId,
          props.originalStartsAt,
          props.allDay,
        )
      const path = `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(instanceId)}`
      const body = props.cancelled
        ? { status: 'cancelled' }
        : {
            summary: props.title,
            description: props.description ?? undefined,
            location: props.location ?? undefined,
            ...slotFor(event),
          }
      const result = await this.api<GoogleEvent>(
        'PATCH',
        path,
        connection.accessToken,
        body,
      )
      return { externalId: result.id ?? instanceId, etag: result.etag ?? null }
    }

    const body = {
      summary: props.title,
      description: props.description ?? undefined,
      location: props.location ?? undefined,
      ...slotFor(event),
      ...(props.recurrence
        ? { recurrence: toGoogleRecurrence(props.recurrence) }
        : {}),
    }
    const path = `/calendars/${encodeURIComponent(connection.calendarId)}/events`
    const result = event.externalId
      ? await this.api<GoogleEvent>(
          'PATCH',
          `${path}/${encodeURIComponent(event.externalId)}`,
          connection.accessToken,
          body,
        )
      : await this.api<GoogleEvent>('POST', path, connection.accessToken, body)
    return { externalId: result.id, etag: result.etag ?? null }
  }

  async deleteEvent(
    connection: CalendarConnection,
    externalId: string,
  ): Promise<void> {
    await this.api(
      'DELETE',
      `/calendars/${encodeURIComponent(connection.calendarId)}/events/${encodeURIComponent(externalId)}`,
      connection.accessToken,
    )
  }

  async watch(
    connection: CalendarConnection,
    callbackUrl: string,
  ): Promise<WatchChannel> {
    const result = await this.api<{
      id: string
      resourceId: string
      expiration?: string
    }>(
      'POST',
      `/calendars/${encodeURIComponent(connection.calendarId)}/events/watch`,
      connection.accessToken,
      {
        id: randomUUID(),
        type: 'web_hook',
        address: callbackUrl,
        ...(process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN?.trim()
          ? { token: process.env.GOOGLE_CALENDAR_WEBHOOK_TOKEN.trim() }
          : {}),
      },
    )
    return {
      channelId: result.id,
      resourceId: result.resourceId,
      expiresAt: result.expiration ? new Date(Number(result.expiration)) : null,
    }
  }

  private async collect(
    connection: CalendarConnection,
    syncToken: string | null,
  ): Promise<CalendarSyncPage> {
    const events: ExternalCalendarEvent[] = []
    let pageToken: string | undefined
    let nextSyncToken: string | null = null
    do {
      // singleEvents=false keeps recurring series as a single master event that
      // carries its RRULE, so recurrence survives the round-trip. Modified/
      // cancelled single instances arrive separately with a recurringEventId
      // and are stored as occurrence overrides applied during expansion.
      const params = new URLSearchParams({
        singleEvents: 'false',
        showDeleted: 'true',
        maxResults: '250',
      })
      if (syncToken) {
        params.set('syncToken', syncToken)
      } else {
        params.set(
          'timeMin',
          new Date(Date.now() - INITIAL_WINDOW_MS).toISOString(),
        )
      }
      if (pageToken) {
        params.set('pageToken', pageToken)
      }
      const page = await this.api<{
        items?: GoogleEvent[]
        nextPageToken?: string
        nextSyncToken?: string
        defaultReminders?: GoogleReminder[]
      }>(
        'GET',
        `/calendars/${encodeURIComponent(connection.calendarId)}/events?${params.toString()}`,
        connection.accessToken,
      )
      // Google returns the calendar's default reminders once at the top of every
      // page; events with `reminders.useDefault` inherit these.
      const defaultReminders = page.defaultReminders ?? []
      for (const item of page.items ?? []) {
        // Exceptions to a recurring series (edited or cancelled instances) carry
        // recurringEventId; we store them as occurrence overrides so expansion
        // can move or hide that single instance. The series master arrives as a
        // separate item with its RRULE.
        events.push(toExternalEvent(item, defaultReminders))
      }
      pageToken = page.nextPageToken
      nextSyncToken = page.nextSyncToken ?? nextSyncToken
    } while (pageToken)
    return { events, nextSyncToken }
  }

  private async token(body: Record<string, string>): Promise<{
    access_token: string
    refresh_token?: string
    expires_in?: number
    id_token?: string
  }> {
    const response = await httpFetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    })
    if (!response.ok) {
      throw new Error(`Google token request failed (${response.status})`)
    }
    return response.json() as Promise<{
      access_token: string
      refresh_token?: string
      expires_in?: number
      id_token?: string
    }>
  }

  private async api<T>(
    method: string,
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<T> {
    const response = await httpFetch(`${CALENDAR_API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    if (response.status === 410) {
      throw new GoneError()
    }
    if (!response.ok && response.status !== 404) {
      throw new Error(`Google Calendar request failed (${response.status})`)
    }
    if (
      method === 'DELETE' ||
      response.status === 204 ||
      response.status === 404
    ) {
      return {} as T
    }
    return response.json() as Promise<T>
  }
}

class GoneError extends Error {
  constructor() {
    super('Google sync token is no longer valid.')
    this.name = 'GoneError'
  }
}
