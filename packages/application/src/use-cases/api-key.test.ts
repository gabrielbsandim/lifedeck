import { describe, expect, it } from 'vitest'
import { ApiKey, asEntityId } from '@lifedeck/domain'
import { makeCreateApiKey } from '@/use-cases/create-api-key'
import { makeListApiKeys } from '@/use-cases/list-api-keys'
import { makeRevokeApiKey } from '@/use-cases/revoke-api-key'
import { makeAuthenticateApiKey } from '@/use-cases/authenticate-api-key'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryApiKeyRepository } from '@/testing/in-memory-api-key-repository'
import { FakeKeyHasher } from '@/testing/fake-key-hasher'
import {
  FixedClock,
  FixedTokenGenerator,
  ID,
  SequentialIdGenerator,
} from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')
const KEY_ID = asEntityId('7c9e6679-7425-40de-944b-e07fc1f90ae7')

function setup() {
  const apiKeys = new InMemoryApiKeyRepository()
  const hasher = new FakeKeyHasher()
  const clock = new FixedClock(NOW)
  return {
    apiKeys,
    hasher,
    clock,
    createApiKey: makeCreateApiKey({
      apiKeys,
      hasher,
      tokens: new FixedTokenGenerator(['secret-token']),
      ids: new SequentialIdGenerator([KEY_ID]),
      clock,
    }),
    listApiKeys: makeListApiKeys({ apiKeys }),
    revokeApiKey: makeRevokeApiKey({ apiKeys, clock }),
    authenticateApiKey: makeAuthenticateApiKey({ apiKeys, hasher, clock }),
  }
}

describe('createApiKey', () => {
  it('returns the raw secret once and persists a hashed key', async () => {
    const ctx = setup()
    const created = await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read', 'tasks:write'],
    })

    expect(created.secret).toBe('tk_live_secret-token')
    expect(created.prefix).toBe('tk_live_secr')
    expect(created.scopes).toEqual(['tasks:read', 'tasks:write'])

    const stored = await ctx.apiKeys.findById(KEY_ID)
    expect(stored?.hashedSecret).toBe('hashed:tk_live_secret-token')
  })

  it('sets an expiry when expiresInDays is given', async () => {
    const ctx = setup()
    const created = await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
      expiresInDays: 30,
    })
    expect(created.expiresAt).toBe('2026-07-22T10:00:00.000Z')
  })

  it('rejects an invalid payload', async () => {
    const ctx = setup()
    await expect(
      ctx.createApiKey(ID.user as string, { name: '', scopes: [] }),
    ).rejects.toBeTruthy()
  })
})

describe('listApiKeys', () => {
  it('lists the keys of the user', async () => {
    const ctx = setup()
    await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
    })
    const keys = await ctx.listApiKeys(ID.user as string)
    expect(keys).toHaveLength(1)
    expect(keys[0]).not.toHaveProperty('secret')
  })
})

describe('revokeApiKey', () => {
  it('revokes a key the user owns', async () => {
    const ctx = setup()
    await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
    })
    await ctx.revokeApiKey(ID.user as string, KEY_ID as string)
    const stored = await ctx.apiKeys.findById(KEY_ID)
    expect(stored?.isActive(NOW)).toBe(false)
  })

  it('rejects revoking a key owned by someone else', async () => {
    const ctx = setup()
    await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
    })
    await expect(
      ctx.revokeApiKey(ID.otherUser as string, KEY_ID as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('rejects revoking an unknown key', async () => {
    const ctx = setup()
    await expect(
      ctx.revokeApiKey(ID.user as string, KEY_ID as string),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('authenticateApiKey', () => {
  it('returns the principal for a valid key and records usage', async () => {
    const ctx = setup()
    const created = await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
    })

    const principal = await ctx.authenticateApiKey(created.secret)
    expect(principal).toEqual({
      keyId: KEY_ID as string,
      userId: ID.user as string,
      scopes: ['tasks:read'],
    })
    const stored = await ctx.apiKeys.findById(KEY_ID)
    expect(stored?.toJSON().lastUsedAt).toEqual(NOW)
  })

  it('returns null for an unknown secret', async () => {
    const ctx = setup()
    expect(await ctx.authenticateApiKey('tk_live_nope')).toBeNull()
  })

  it('returns null for a revoked key', async () => {
    const ctx = setup()
    const created = await ctx.createApiKey(ID.user as string, {
      name: 'CI',
      scopes: ['tasks:read'],
    })
    await ctx.revokeApiKey(ID.user as string, KEY_ID as string)
    expect(await ctx.authenticateApiKey(created.secret)).toBeNull()
  })

  it('returns null for an expired key', async () => {
    const apiKeys = new InMemoryApiKeyRepository()
    const hasher = new FakeKeyHasher()
    const expired = ApiKey.create({
      id: KEY_ID,
      userId: ID.user,
      name: 'Old',
      prefix: 'tk_live_old',
      hashedSecret: hasher.hash('tk_live_old-secret'),
      scopes: ['tasks:read'],
      expiresAt: new Date('2026-06-21T10:00:00.000Z'),
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    })
    await apiKeys.save(expired)
    const authenticate = makeAuthenticateApiKey({
      apiKeys,
      hasher,
      clock: new FixedClock(NOW),
    })
    expect(await authenticate('tk_live_old-secret')).toBeNull()
  })
})
