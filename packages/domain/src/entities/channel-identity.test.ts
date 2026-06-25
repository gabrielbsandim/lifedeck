import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { ChannelIdentity } from '@/entities/channel-identity'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const USER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const NOW = new Date('2026-06-24T10:00:00.000Z')

const EXPIRES = new Date('2026-06-24T10:10:00.000Z')

function build(): ChannelIdentity {
  return ChannelIdentity.create({
    id: asEntityId(ID),
    userId: asEntityId(USER_ID),
    channel: 'whatsapp',
    pairingCode: '123456',
    pairingExpiresAt: EXPIRES,
    now: NOW,
  })
}

describe('ChannelIdentity', () => {
  it('creates a pending identity with a pairing code', () => {
    const identity = build()
    expect(identity.id).toBe(ID)
    expect(identity.userId).toBe(USER_ID)
    expect(identity.channel).toBe('whatsapp')
    expect(identity.isVerified()).toBe(false)
    expect(identity.address).toBeNull()
    expect(identity.pairingCode).toBe('123456')
  })

  it('rejects an empty pairing code', () => {
    expect(() =>
      ChannelIdentity.create({
        id: asEntityId(ID),
        userId: asEntityId(USER_ID),
        channel: 'whatsapp',
        pairingCode: '  ',
        pairingExpiresAt: EXPIRES,
        now: NOW,
      }),
    ).toThrow(ValidationError)
  })

  it('verifies against an inbound address, clearing the code', () => {
    const identity = build()
    const later = new Date('2026-06-24T10:05:00.000Z')
    identity.verify('5511999990000', later)
    expect(identity.isVerified()).toBe(true)
    expect(identity.address).toBe('+5511999990000')
    expect(identity.pairingCode).toBeNull()
    expect(identity.pairingExpiresAt).toBeNull()
    expect(identity.verifiedAt).toEqual(later)
  })

  it('rejects an invalid address on verify', () => {
    const identity = build()
    expect(() => identity.verify('not-a-phone', NOW)).toThrow(ValidationError)
  })

  it('regenerates the pairing code while pending', () => {
    const identity = build()
    const later = new Date('2026-06-24T10:05:00.000Z')
    const newExpiry = new Date('2026-06-24T10:15:00.000Z')
    identity.regenerateCode('654321', newExpiry, later)
    expect(identity.pairingCode).toBe('654321')
    expect(identity.pairingExpiresAt).toEqual(newExpiry)
    expect(identity.toJSON().updatedAt).toEqual(later)
  })

  it('treats the code as expired at or after its expiry', () => {
    const identity = build()
    expect(identity.isCodeExpired(new Date('2026-06-24T10:09:59.000Z'))).toBe(
      false,
    )
    expect(identity.isCodeExpired(EXPIRES)).toBe(true)
  })

  it('refuses to regenerate a code once verified', () => {
    const identity = build()
    identity.verify('5511999990000', NOW)
    expect(() => identity.regenerateCode('654321', EXPIRES, NOW)).toThrow(
      ValidationError,
    )
  })

  it('restores from persisted props', () => {
    const identity = build()
    expect(ChannelIdentity.restore(identity.toJSON()).toJSON()).toEqual(
      identity.toJSON(),
    )
  })
})
