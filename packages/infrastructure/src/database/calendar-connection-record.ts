import {
  CalendarConnection,
  asEntityId,
  type CalendarProviderName,
} from '@lifedeck/domain'

export type CalendarConnectionRecord = {
  id: string
  ownerId: string
  provider: CalendarProviderName
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  calendarId: string
  syncToken: string | null
  channelId: string | null
  resourceId: string | null
  channelExpiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainCalendarConnection(
  record: CalendarConnectionRecord,
): CalendarConnection {
  return CalendarConnection.restore({
    id: asEntityId(record.id),
    ownerId: asEntityId(record.ownerId),
    provider: record.provider,
    accessToken: record.accessToken,
    refreshToken: record.refreshToken,
    tokenExpiresAt: record.tokenExpiresAt,
    calendarId: record.calendarId,
    syncToken: record.syncToken,
    channelId: record.channelId,
    resourceId: record.resourceId,
    channelExpiresAt: record.channelExpiresAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export function toCalendarConnectionRecord(
  connection: CalendarConnection,
): CalendarConnectionRecord {
  const props = connection.toJSON()
  return {
    id: props.id,
    ownerId: props.ownerId,
    provider: props.provider,
    accessToken: props.accessToken,
    refreshToken: props.refreshToken,
    tokenExpiresAt: props.tokenExpiresAt,
    calendarId: props.calendarId,
    syncToken: props.syncToken,
    channelId: props.channelId,
    resourceId: props.resourceId,
    channelExpiresAt: props.channelExpiresAt,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }
}
