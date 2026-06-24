import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { CalendarConnection } from '@/entities/calendar-connection'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NOW = new Date('2026-06-24T10:00:00.000Z')

function build(): CalendarConnection {
  return CalendarConnection.create({
    id: asEntityId(ID),
    ownerId: asEntityId(OWNER_ID),
    provider: 'google',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    tokenExpiresAt: new Date('2026-06-24T11:00:00.000Z'),
    now: NOW,
  })
}

describe('CalendarConnection', () => {
  it('creates with the default primary calendar and owner', () => {
    const connection = build()
    expect(connection.id).toBe(ID)
    expect(connection.calendarId).toBe('primary')
    expect(connection.syncToken).toBeNull()
    expect(connection.isOwnedBy(asEntityId(OWNER_ID))).toBe(true)
  })

  it('rejects an empty refresh token', () => {
    expect(() =>
      CalendarConnection.create({
        id: asEntityId(ID),
        ownerId: asEntityId(OWNER_ID),
        provider: 'google',
        accessToken: 'access-1',
        refreshToken: '  ',
        tokenExpiresAt: NOW,
        now: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('detects a token that needs refreshing within the skew window', () => {
    const connection = build()
    expect(connection.needsRefresh(new Date('2026-06-24T10:00:00.000Z'))).toBe(
      false,
    )
    expect(connection.needsRefresh(new Date('2026-06-24T10:59:30.000Z'))).toBe(
      true,
    )
  })

  it('refreshes access, sets the sync token and watch channel', () => {
    const connection = build()
    const later = new Date('2026-06-24T10:30:00.000Z')
    connection.refreshAccess(
      'access-2',
      new Date('2026-06-24T11:30:00.000Z'),
      later,
    )
    connection.setSyncToken('sync-1', later)
    connection.setChannel(
      'chan-1',
      'res-1',
      new Date('2026-06-31T10:00:00.000Z'),
      later,
    )
    const props = connection.toJSON()
    expect(props.accessToken).toBe('access-2')
    expect(props.syncToken).toBe('sync-1')
    expect(props.channelId).toBe('chan-1')
    expect(props.resourceId).toBe('res-1')
    expect(props.updatedAt).toEqual(later)
    expect(connection.channelId).toBe('chan-1')
    expect(connection.channelExpiresAt).toEqual(
      new Date('2026-06-31T10:00:00.000Z'),
    )
  })

  it('exposes a null watch channel before one is registered', () => {
    const connection = build()
    expect(connection.channelId).toBeNull()
    expect(connection.channelExpiresAt).toBeNull()
  })

  it('restores from persisted props', () => {
    const connection = build()
    expect(CalendarConnection.restore(connection.toJSON()).toJSON()).toEqual(
      connection.toJSON(),
    )
  })
})
