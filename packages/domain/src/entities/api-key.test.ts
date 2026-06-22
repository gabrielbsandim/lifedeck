import { describe, expect, it } from 'vitest'
import { ApiKey } from '@/entities/api-key'
import { asEntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'

const ID = asEntityId('11111111-1111-4111-8111-111111111111')
const USER = asEntityId('22222222-2222-4222-8222-222222222222')
const NOW = new Date('2026-06-22T10:00:00.000Z')

function build(overrides: Partial<Parameters<typeof ApiKey.create>[0]> = {}) {
  return ApiKey.create({
    id: ID,
    userId: USER,
    name: 'CI pipeline',
    prefix: 'tk_live_abcd',
    hashedSecret: 'hashed',
    scopes: ['tasks:read', 'tasks:write'],
    expiresAt: null,
    createdAt: NOW,
    ...overrides,
  })
}

describe('ApiKey', () => {
  it('creates an active key with unique scopes', () => {
    const key = build({ scopes: ['tasks:read', 'tasks:read', 'lists:read'] })
    expect(key.scopes).toEqual(['tasks:read', 'lists:read'])
    expect(key.isActive(NOW)).toBe(true)
    expect(key.hasScope('tasks:read')).toBe(true)
    expect(key.hasScope('lists:write')).toBe(false)
    expect(key.toJSON().lastUsedAt).toBeNull()
  })

  it('exposes prefix, user, and hashed secret', () => {
    const key = build()
    expect(key.id).toBe(ID)
    expect(key.userId).toBe(USER)
    expect(key.prefix).toBe('tk_live_abcd')
    expect(key.hashedSecret).toBe('hashed')
  })

  it('rejects an empty name', () => {
    expect(() => build({ name: '  ' })).toThrow(ValidationError)
  })

  it('rejects a name over the limit', () => {
    expect(() => build({ name: 'x'.repeat(81) })).toThrow(ValidationError)
  })

  it('rejects an empty scope list', () => {
    expect(() => build({ scopes: [] })).toThrow(ValidationError)
  })

  it('rejects an unknown scope', () => {
    expect(() => build({ scopes: ['tasks:delete'] })).toThrow(ValidationError)
  })

  it('rejects an empty prefix or secret', () => {
    expect(() => build({ prefix: '' })).toThrow(ValidationError)
    expect(() => build({ hashedSecret: '' })).toThrow(ValidationError)
  })

  it('is inactive once revoked, idempotently', () => {
    const key = build()
    key.revoke(NOW)
    const revokedAt = key.toJSON().revokedAt
    expect(key.isActive(NOW)).toBe(false)
    key.revoke(new Date('2026-06-23T10:00:00.000Z'))
    expect(key.toJSON().revokedAt).toEqual(revokedAt)
  })

  it('is inactive once expired', () => {
    const key = build({ expiresAt: new Date('2026-06-22T09:00:00.000Z') })
    expect(key.isActive(NOW)).toBe(false)
  })

  it('records the last used time', () => {
    const key = build()
    key.markUsed(NOW)
    expect(key.toJSON().lastUsedAt).toEqual(NOW)
  })

  it('restores from persisted props', () => {
    const key = ApiKey.restore({
      id: ID,
      userId: USER,
      name: 'Restored',
      prefix: 'tk_live_zzzz',
      hashedSecret: 'hashed',
      scopes: ['analytics:read'],
      lastUsedAt: NOW,
      expiresAt: null,
      revokedAt: null,
      createdAt: NOW,
    })
    expect(key.isActive(NOW)).toBe(true)
    expect(key.scopes).toEqual(['analytics:read'])
  })
})
