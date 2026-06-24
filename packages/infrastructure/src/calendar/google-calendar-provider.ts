import { randomUUID } from 'node:crypto'
import type { CalendarConnection, CalendarEvent } from '@lifedeck/domain'
import type {
  CalendarProvider,
  CalendarSyncPage,
  ExternalCalendarEvent,
  OAuthTokens,
  RefreshedToken,
  WatchChannel,
} from '@lifedeck/application'

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3'
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'
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

function toExternalEvent(item: GoogleEvent): ExternalCalendarEvent {
  const startsAt = parseSlot(item.start) ?? new Date(0)
  const endsAt = parseSlot(item.end) ?? startsAt
  return {
    externalId: item.id,
    etag: item.etag ?? null,
    title: item.summary?.trim() || '(no title)',
    description: item.description ?? null,
    location: item.location ?? null,
    startsAt,
    endsAt,
    allDay: Boolean(item.start?.date),
    recurrence: null,
    updatedAt: item.updated ? new Date(item.updated) : new Date(0),
    deleted: item.status === 'cancelled',
  }
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
      prompt: 'consent',
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
    try {
      return await this.collect(connection, connection.syncToken)
    } catch (error) {
      if (error instanceof GoneError) {
        // The stored sync token expired; restart a full incremental sync.
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
    const body = {
      summary: props.title,
      description: props.description ?? undefined,
      location: props.location ?? undefined,
      ...slotFor(event),
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
      { id: randomUUID(), type: 'web_hook', address: callbackUrl },
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
      const params = new URLSearchParams({
        singleEvents: 'true',
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
      }>(
        'GET',
        `/calendars/${encodeURIComponent(connection.calendarId)}/events?${params.toString()}`,
        connection.accessToken,
      )
      for (const item of page.items ?? []) {
        events.push(toExternalEvent(item))
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
  }> {
    const response = await fetch(TOKEN_ENDPOINT, {
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
    }>
  }

  private async api<T>(
    method: string,
    path: string,
    accessToken: string,
    body?: unknown,
  ): Promise<T> {
    const response = await fetch(`${CALENDAR_API}${path}`, {
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
