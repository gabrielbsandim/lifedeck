import { describe, expect, it } from 'vitest'
import { ChannelIdentity, asEntityId } from '@lifedeck/domain'
import {
  toChannelIdentityRecord,
  toDomainChannelIdentity,
  type ChannelIdentityRecord,
} from '@/database/channel-identity-record'

const RECORD: ChannelIdentityRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  userId: 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb',
  channel: 'whatsapp',
  address: '+5511999990000',
  pairingCode: null,
  pairingExpiresAt: null,
  verifiedAt: new Date('2026-06-24T10:05:00.000Z'),
  createdAt: new Date('2026-06-24T10:00:00.000Z'),
  updatedAt: new Date('2026-06-24T10:05:00.000Z'),
}

describe('channel-identity-record', () => {
  it('maps a record to a domain identity', () => {
    const identity = toDomainChannelIdentity(RECORD)
    expect(identity.id).toBe(RECORD.id)
    expect(identity.address).toBe('+5511999990000')
    expect(identity.isVerified()).toBe(true)
  })

  it('maps a domain identity back to a record', () => {
    const identity = ChannelIdentity.restore({
      id: asEntityId(RECORD.id),
      userId: asEntityId(RECORD.userId),
      channel: RECORD.channel,
      address: RECORD.address,
      pairingCode: RECORD.pairingCode,
      pairingExpiresAt: RECORD.pairingExpiresAt,
      verifiedAt: RECORD.verifiedAt,
      createdAt: RECORD.createdAt,
      updatedAt: RECORD.updatedAt,
    })
    expect(toChannelIdentityRecord(identity)).toEqual(RECORD)
  })
})
