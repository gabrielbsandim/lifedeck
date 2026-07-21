import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { CalendarProviderName } from '@/value-objects/calendar-provider'

export type CalendarConnectionProps = {
  id: EntityId
  ownerId: EntityId
  provider: CalendarProviderName
  accountEmail: string | null
  isDefault: boolean
  // The primary credential used to authenticate requests: an OAuth access token
  // (Google), a CalDAV app-specific password (Apple), or an API key (cal.com).
  accessToken: string
  // OAuth refresh token; null for providers that use a static, non-expiring
  // credential (Apple app password, cal.com API key).
  refreshToken: string | null
  // When the access token expires; null when the credential never expires.
  tokenExpiresAt: Date | null
  calendarId: string
  syncToken: string | null
  channelId: string | null
  resourceId: string | null
  channelExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export class CalendarConnection {
  private constructor(private props: CalendarConnectionProps) {}

  static create(input: {
    id: EntityId
    ownerId: EntityId
    provider: CalendarProviderName
    accessToken: string
    refreshToken?: string | null
    tokenExpiresAt?: Date | null
    calendarId?: string
    accountEmail?: string | null
    isDefault?: boolean
    now: Date
  }): CalendarConnection {
    return new CalendarConnection({
      id: input.id,
      ownerId: input.ownerId,
      provider: input.provider,
      accountEmail: input.accountEmail ?? null,
      isDefault: input.isDefault ?? false,
      accessToken: guard.notEmpty(input.accessToken, 'Access token'),
      refreshToken: input.refreshToken ?? null,
      tokenExpiresAt: input.tokenExpiresAt ?? null,
      calendarId: input.calendarId ?? 'primary',
      syncToken: null,
      channelId: null,
      resourceId: null,
      channelExpiresAt: null,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: CalendarConnectionProps): CalendarConnection {
    return new CalendarConnection({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get ownerId(): EntityId {
    return this.props.ownerId
  }

  get accessToken(): string {
    return this.props.accessToken
  }

  get refreshToken(): string | null {
    return this.props.refreshToken
  }

  get provider(): CalendarProviderName {
    return this.props.provider
  }

  get accountEmail(): string | null {
    return this.props.accountEmail
  }

  get isDefault(): boolean {
    return this.props.isDefault
  }

  get calendarId(): string {
    return this.props.calendarId
  }

  get syncToken(): string | null {
    return this.props.syncToken
  }

  get channelId(): string | null {
    return this.props.channelId
  }

  get channelExpiresAt(): Date | null {
    return this.props.channelExpiresAt
  }

  isOwnedBy(userId: EntityId): boolean {
    return this.props.ownerId === userId
  }

  // Only OAuth connections (a non-null expiry) ever need a refresh; a static
  // credential (null expiry) never does.
  needsRefresh(now: Date, skewMs = 60_000): boolean {
    return (
      this.props.tokenExpiresAt !== null &&
      this.props.tokenExpiresAt.getTime() - skewMs <= now.getTime()
    )
  }

  // Replaces the primary credential. For OAuth this is a refreshed access token
  // with a new expiry; for a static credential (reconnect with a rotated app
  // password / API key) the expiry is null.
  refreshAccess(
    accessToken: string,
    tokenExpiresAt: Date | null,
    now: Date,
  ): void {
    this.props.accessToken = guard.notEmpty(accessToken, 'Access token')
    this.props.tokenExpiresAt = tokenExpiresAt
    this.props.updatedAt = now
  }

  setSyncToken(syncToken: string | null, now: Date): void {
    this.props.syncToken = syncToken
    this.props.updatedAt = now
  }

  markDefault(isDefault: boolean, now: Date): void {
    this.props.isDefault = isDefault
    this.props.updatedAt = now
  }

  // Backfills the connected account email on a legacy connection created before
  // it was captured, so it can be de-duplicated by account thereafter.
  setAccountEmail(accountEmail: string | null, now: Date): void {
    this.props.accountEmail = accountEmail
    this.props.updatedAt = now
  }

  setChannel(
    channelId: string | null,
    resourceId: string | null,
    channelExpiresAt: Date | null,
    now: Date,
  ): void {
    this.props.channelId = channelId
    this.props.resourceId = resourceId
    this.props.channelExpiresAt = channelExpiresAt
    this.props.updatedAt = now
  }

  toJSON(): CalendarConnectionProps {
    return { ...this.props }
  }
}
