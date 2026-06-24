import type {
  CalendarConnection,
  CalendarEvent,
  CalendarProviderName,
  RecurrenceRule,
} from '@lifedeck/domain'

export type ExternalCalendarEvent = {
  externalId: string
  etag: string | null
  title: string
  description: string | null
  location: string | null
  startsAt: Date
  endsAt: Date
  allDay: boolean
  recurrence: RecurrenceRule | null
  updatedAt: Date
  deleted: boolean
}

export type CalendarSyncPage = {
  events: ExternalCalendarEvent[]
  nextSyncToken: string | null
}

export type OAuthTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export type RefreshedToken = {
  accessToken: string
  expiresAt: Date
}

export type WatchChannel = {
  channelId: string
  resourceId: string
  expiresAt: Date | null
}

export interface CalendarProvider {
  readonly provider: CalendarProviderName
  exchangeCode(code: string, redirectUri: string): Promise<OAuthTokens>
  refreshAccessToken(refreshToken: string): Promise<RefreshedToken>
  listChanges(connection: CalendarConnection): Promise<CalendarSyncPage>
  pushEvent(
    connection: CalendarConnection,
    event: CalendarEvent,
  ): Promise<{ externalId: string; etag: string | null }>
  deleteEvent(connection: CalendarConnection, externalId: string): Promise<void>
  watch(
    connection: CalendarConnection,
    callbackUrl: string,
  ): Promise<WatchChannel>
}
