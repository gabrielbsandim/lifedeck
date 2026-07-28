import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, string>()
const redis = {
  set: vi.fn((key: string, value: string) => {
    store.set(key, value)
    return Promise.resolve('OK')
  }),
  getdel: vi.fn((key: string) => {
    const value = store.get(key) ?? null
    store.delete(key)
    return Promise.resolve(value)
  }),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => redis),
}))

vi.mock('@/server/api/logger', () => ({ log: vi.fn() }))

const {
  claimNativeAuthCode,
  isNativeAuthState,
  issueNativeAuthCode,
  nativeAuthRedirect,
  nativeAuthState,
  resetNativeAuthClient,
} = await import('@/server/session/native-auth')

describe('native auth handoff', () => {
  beforeEach(() => {
    store.clear()
    redis.set.mockClear()
    redis.getdel.mockClear()
    resetNativeAuthClient()
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
  })

  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetNativeAuthClient()
  })

  it('marks and recognizes a native OAuth state', () => {
    const state = nativeAuthState()
    expect(isNativeAuthState(state)).toBe(true)
    expect(isNativeAuthState('plain-uuid')).toBe(false)
    expect(isNativeAuthState(null)).toBe(false)
  })

  it('exchanges a code for the stored token exactly once', async () => {
    const code = await issueNativeAuthCode('jwt-token')
    expect(code).not.toBeNull()
    await expect(claimNativeAuthCode(code as string)).resolves.toBe('jwt-token')
    await expect(claimNativeAuthCode(code as string)).resolves.toBeNull()
  })

  it('stores the code with a short expiry', async () => {
    await issueNativeAuthCode('jwt-token')
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('lifedeck/native-auth/'),
      'jwt-token',
      { ex: 120 },
    )
  })

  it('returns null when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    resetNativeAuthClient()
    await expect(issueNativeAuthCode('jwt-token')).resolves.toBeNull()
    await expect(claimNativeAuthCode('anything')).resolves.toBeNull()
  })

  it('returns null when Redis throws', async () => {
    redis.set.mockRejectedValueOnce(new Error('down'))
    await expect(issueNativeAuthCode('jwt-token')).resolves.toBeNull()
    redis.getdel.mockRejectedValueOnce(new Error('down'))
    await expect(claimNativeAuthCode('code')).resolves.toBeNull()
  })

  it('builds the app deep link for success and failure', () => {
    expect(nativeAuthRedirect({ code: 'abc' })).toBe('lifedeck://auth?code=abc')
    expect(nativeAuthRedirect({ error: 'denied' })).toBe(
      'lifedeck://auth?error=denied',
    )
    expect(nativeAuthRedirect({})).toBe('lifedeck://auth?error=auth_failed')
  })
})
