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
  // Minutes-before offsets the remote calendar carries for this event, so a
  // synced event fires the same lead-time reminders a locally created one does.
  // Empty when the provider has no reminder data.
  reminders: number[]
  updatedAt: Date
  // `deleted` removes a top-level event's row. Occurrence overrides never delete
  // a row: `recurringEventExternalId` links them to the series master and
  // `cancelledOccurrence` hides just that one instance during expansion.
  recurringEventExternalId: string | null
  originalStartsAt: Date | null
  cancelledOccurrence: boolean
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
  accountEmail: string | null
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

// A user-entered static credential for a non-OAuth provider: an Apple ID +
// app-specific password (Apple CalDAV) or an account email + API key (cal.com).
export type CredentialConnectInput = {
  accountEmail: string
  secret: string
}

// What a provider resolves from a valid credential: the label to store and the
// calendar collection to sync (a CalDAV calendar href for Apple).
export type CredentialConnectResult = {
  accountEmail: string
  calendarId: string
}

// Resolves the adapter for a connection's provider, so sync use cases can drive
// a user's Google, Apple, and cal.com calendars through one code path. The
// container registers one adapter per CalendarProviderName.
export interface CalendarProviderRegistry {
  get(provider: CalendarProviderName): CalendarProvider
}

export interface CalendarProvider {
  readonly provider: CalendarProviderName
  // Whether local events push back to this provider. Omitted means writable
  // (Google, Apple); a read-only provider (cal.com, whose model is bookings, not
  // an event store) sets false so the push/delete use cases skip it.
  readonly writable?: boolean
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
  // Present only on static-credential providers (Apple, cal.com): validates a
  // user-entered secret and resolves the account label + calendar to sync.
  // OAuth providers (Google) connect via exchangeCode and omit this.
  connectWithCredentials?(
    input: CredentialConnectInput,
  ): Promise<CredentialConnectResult>
}
