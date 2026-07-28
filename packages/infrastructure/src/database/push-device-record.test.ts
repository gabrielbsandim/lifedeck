import { describe, expect, it } from 'vitest'
import { PushDevice, asEntityId } from '@lifedeck/domain'
import {
  toDomainPushDevice,
  toPushDeviceRecord,
} from '@/database/push-device-record'

const ID = '1a000000-0000-4000-8000-0000000000a1'
const USER = '1a000000-0000-4000-8000-0000000000b1'
const CREATED_AT = new Date('2026-06-01T10:00:00.000Z')
const LAST_SEEN_AT = new Date('2026-06-22T10:00:00.000Z')

const record = {
  id: ID,
  userId: USER,
  token: 'ExponentPushToken[abc]',
  platform: 'android',
  lastSeenAt: LAST_SEEN_AT,
  createdAt: CREATED_AT,
}

describe('push device record', () => {
  it('restores a stored row into the entity', () => {
    expect(toDomainPushDevice(record).toJSON()).toEqual({
      id: asEntityId(ID),
      userId: asEntityId(USER),
      token: 'ExponentPushToken[abc]',
      platform: 'android',
      lastSeenAt: LAST_SEEN_AT,
      createdAt: CREATED_AT,
    })
  })

  it('round-trips without losing a field', () => {
    expect(toPushDeviceRecord(toDomainPushDevice(record))).toEqual(record)
  })

  it('flattens a freshly created device', () => {
    const created = PushDevice.create({
      id: asEntityId(ID),
      userId: asEntityId(USER),
      token: 'token',
      platform: 'ios',
      createdAt: CREATED_AT,
    })
    expect(toPushDeviceRecord(created)).toEqual({
      id: ID,
      userId: USER,
      token: 'token',
      platform: 'ios',
      lastSeenAt: CREATED_AT,
      createdAt: CREATED_AT,
    })
  })

  it('rejects a row whose platform is not one we support', () => {
    expect(() =>
      toDomainPushDevice({ ...record, platform: 'windows' }),
    ).toThrow()
  })
})
