// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const authenticateApiKey = vi.fn()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ authenticateApiKey }),
}))

import {
  authenticateRequest,
  optionalUserId,
  requireScope,
} from '@/server/api/authenticate'
import { SESSION_COOKIE, createSessionToken } from '@/server/session/session'

const USER_ID = 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f'

function withHeaders(headers: Record<string, string>): Request {
  return new Request('https://taskin.app/api/v1/tasks', { headers })
}

async function withCookie(): Promise<Request> {
  const token = await createSessionToken(USER_ID, new Date())
  return withHeaders({ cookie: `${SESSION_COOKIE}=${token}` })
}

describe('authenticateRequest', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-value-for-signing-tokens'
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    authenticateApiKey.mockReset()
  })

  it('authenticates a Bearer API key and reports its scopes', async () => {
    authenticateApiKey.mockResolvedValue({
      userId: USER_ID,
      scopes: ['tasks:read'],
    })
    const principal = await authenticateRequest(
      withHeaders({ authorization: 'Bearer tk_live_secret' }),
    )
    expect(principal).toEqual({
      userId: USER_ID,
      scopes: ['tasks:read'],
      viaApiKey: true,
    })
    expect(authenticateApiKey).toHaveBeenCalledWith('tk_live_secret')
  })

  it('authenticates an X-API-Key header', async () => {
    authenticateApiKey.mockResolvedValue({
      userId: USER_ID,
      scopes: ['lists:read'],
    })
    const principal = await authenticateRequest(
      withHeaders({ 'x-api-key': 'tk_live_secret' }),
    )
    expect(principal?.viaApiKey).toBe(true)
  })

  it('returns null for an invalid API key', async () => {
    authenticateApiKey.mockResolvedValue(null)
    const principal = await authenticateRequest(
      withHeaders({ authorization: 'Bearer tk_live_bad' }),
    )
    expect(principal).toBeNull()
  })

  it('ignores a Bearer token that is not an API key', async () => {
    const principal = await authenticateRequest(
      withHeaders({ authorization: 'Bearer something-else' }),
    )
    expect(principal).toBeNull()
    expect(authenticateApiKey).not.toHaveBeenCalled()
  })

  it('falls back to the session cookie with full scopes', async () => {
    const principal = await authenticateRequest(await withCookie())
    expect(principal?.userId).toBe(USER_ID)
    expect(principal?.viaApiKey).toBe(false)
    expect(principal?.scopes).toContain('tasks:write')
  })

  it('returns null without any credentials', async () => {
    expect(await authenticateRequest(withHeaders({}))).toBeNull()
  })
})

describe('requireScope', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-value-for-signing-tokens'
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    authenticateApiKey.mockReset()
  })

  it('returns the user id when the scope is granted', async () => {
    const result = await requireScope(await withCookie(), 'tasks:write')
    expect(result).toEqual({ userId: USER_ID })
  })

  it('responds 401 without credentials', async () => {
    const result = await requireScope(withHeaders({}), 'tasks:write')
    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(401)
  })

  it('responds 403 when the key lacks the scope', async () => {
    authenticateApiKey.mockResolvedValue({
      keyId: 'k1',
      userId: USER_ID,
      scopes: ['tasks:read'],
    })
    const result = await requireScope(
      withHeaders({ authorization: 'Bearer tk_live_secret' }),
      'tasks:write',
    )
    expect((result as Response).status).toBe(403)
  })

  it('grants an API key request when within the rate limit', async () => {
    authenticateApiKey.mockResolvedValue({
      keyId: 'k1',
      userId: USER_ID,
      scopes: ['tasks:write'],
    })
    const result = await requireScope(
      withHeaders({ authorization: 'Bearer tk_live_secret' }),
      'tasks:write',
    )
    expect(result).toEqual({ userId: USER_ID })
  })
})

describe('optionalUserId', () => {
  afterEach(() => {
    authenticateApiKey.mockReset()
  })

  it('returns null when there is no principal', async () => {
    expect(await optionalUserId(withHeaders({}), 'lists:read')).toBeNull()
  })

  it('returns null when the principal lacks the scope', async () => {
    authenticateApiKey.mockResolvedValue({
      userId: USER_ID,
      scopes: ['tasks:read'],
    })
    const result = await optionalUserId(
      withHeaders({ authorization: 'Bearer tk_live_secret' }),
      'lists:read',
    )
    expect(result).toBeNull()
  })

  it('returns the user id when the scope is granted', async () => {
    authenticateApiKey.mockResolvedValue({
      userId: USER_ID,
      scopes: ['lists:read'],
    })
    const result = await optionalUserId(
      withHeaders({ authorization: 'Bearer tk_live_secret' }),
      'lists:read',
    )
    expect(result).toBe(USER_ID)
  })
})
