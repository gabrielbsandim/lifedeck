import { describe, expect, it } from 'vitest'
import { PushDevice, toPushPlatform } from '@/entities/push-device'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'

const ID = asEntityId('1a000000-0000-4000-8000-0000000000a1')
const USER = asEntityId('1a000000-0000-4000-8000-0000000000b1')
const OTHER = asEntityId('1a000000-0000-4000-8000-0000000000b2')
const NOW = new Date('2026-06-22T10:00:00.000Z')
const LATER = new Date('2026-06-23T10:00:00.000Z')

function device(): PushDevice {
  return PushDevice.create({
    id: ID,
    userId: USER,
    token: 'ExponentPushToken[abc]',
    platform: 'ios',
    createdAt: NOW,
  })
}

describe('PushDevice', () => {
  it('starts out last seen at creation time', () => {
    expect(device().toJSON()).toEqual({
      id: ID,
      userId: USER,
      token: 'ExponentPushToken[abc]',
      platform: 'ios',
      createdAt: NOW,
      lastSeenAt: NOW,
    })
  })

  it('exposes the fields the sender needs', () => {
    const created = device()
    expect(created.id).toBe(ID)
    expect(created.userId).toBe(USER)
    expect(created.token).toBe('ExponentPushToken[abc]')
    expect(created.platform).toBe('ios')
  })

  it('trims the token so a padded value is not stored twice', () => {
    const created = PushDevice.create({
      id: ID,
      userId: USER,
      token: '  ExponentPushToken[abc]  ',
      platform: 'android',
      createdAt: NOW,
    })
    expect(created.token).toBe('ExponentPushToken[abc]')
  })

  it('rejects an empty token', () => {
    expect(() =>
      PushDevice.create({
        id: ID,
        userId: USER,
        token: '   ',
        platform: 'ios',
        createdAt: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('rejects an unknown platform', () => {
    expect(() =>
      PushDevice.create({
        id: ID,
        userId: USER,
        token: 'token',
        platform: 'web' as never,
        createdAt: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('records a fresh sighting on re-registration', () => {
    const created = device()
    created.touch(LATER)
    expect(created.toJSON().lastSeenAt).toBe(LATER)
    expect(created.toJSON().createdAt).toBe(NOW)
  })

  it('moves to the user who is signed in now', () => {
    const created = device()
    created.claim(OTHER, 'android', LATER)
    expect(created.userId).toBe(OTHER)
    expect(created.platform).toBe('android')
    expect(created.toJSON().lastSeenAt).toBe(LATER)
  })

  it('rejects an unknown platform when claiming', () => {
    const created = device()
    expect(() => created.claim(OTHER, 'web' as never, LATER)).toThrow(
      ValidationError,
    )
  })

  it('restores a stored device without revalidating it', () => {
    const stored = PushDevice.restore({
      id: ID,
      userId: USER,
      token: 'token',
      platform: 'android',
      createdAt: NOW,
      lastSeenAt: LATER,
    })
    expect(stored.toJSON().lastSeenAt).toBe(LATER)
  })

  it('converts a platform string at the boundary', () => {
    expect(toPushPlatform('ios')).toBe('ios')
    expect(() => toPushPlatform('windows')).toThrow(ValidationError)
  })
})
