import { describe, expect, it } from 'vitest'
import {
  toApiKeyRecord,
  toDomainApiKey,
  type ApiKeyRecord,
} from '@/database/api-key-record'

const RECORD: ApiKeyRecord = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  name: 'CI pipeline',
  prefix: 'tk_live_abcd',
  secretHash: 'deadbeef',
  scopes: ['tasks:read', 'tasks:write'],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: new Date('2026-06-22T10:00:00.000Z'),
}

describe('api key record', () => {
  it('round-trips through the domain entity', () => {
    const domain = toDomainApiKey(RECORD)
    expect(toApiKeyRecord(domain)).toEqual(RECORD)
  })

  it('preserves usage, expiry, and revocation timestamps', () => {
    const used: ApiKeyRecord = {
      ...RECORD,
      lastUsedAt: new Date('2026-06-22T11:00:00.000Z'),
      expiresAt: new Date('2026-07-22T10:00:00.000Z'),
      revokedAt: new Date('2026-06-23T10:00:00.000Z'),
    }
    expect(toApiKeyRecord(toDomainApiKey(used))).toEqual(used)
  })

  it('drops unknown scopes stored in the database', () => {
    const domain = toDomainApiKey({
      ...RECORD,
      scopes: ['tasks:read', 'tasks:delete'],
    })
    expect(domain.scopes).toEqual(['tasks:read'])
  })
})
