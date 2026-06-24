import { describe, expect, it } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import {
  toCalendarConnectionRecord,
  toDomainCalendarConnection,
  type CalendarConnectionRecord,
} from '@/database/calendar-connection-record'

const RECORD: CalendarConnectionRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  ownerId: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
  provider: 'google',
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
  calendarId: 'primary',
  syncToken: null,
  channelId: null,
  resourceId: null,
  channelExpiresAt: null,
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
  updatedAt: new Date('2026-06-24T10:00:00.000Z'),
}

describe('calendar-connection-record', () => {
  it('maps a record to a domain connection', () => {
    const connection = toDomainCalendarConnection(RECORD)
    expect(connection.id).toBe(RECORD.id)
    expect(connection.calendarId).toBe('primary')
  })

  it('maps a domain connection back to a record', () => {
    const connection = CalendarConnection.restore({
      id: asEntityId(RECORD.id),
      ownerId: asEntityId(RECORD.ownerId),
      provider: RECORD.provider,
      accessToken: RECORD.accessToken,
      refreshToken: RECORD.refreshToken,
      tokenExpiresAt: RECORD.tokenExpiresAt,
      calendarId: RECORD.calendarId,
      syncToken: RECORD.syncToken,
      channelId: RECORD.channelId,
      resourceId: RECORD.resourceId,
      channelExpiresAt: RECORD.channelExpiresAt,
      createdAt: RECORD.createdAt,
      updatedAt: RECORD.updatedAt,
    })
    expect(toCalendarConnectionRecord(connection)).toEqual(RECORD)
  })
})
