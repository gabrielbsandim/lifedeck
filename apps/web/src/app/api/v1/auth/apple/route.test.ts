// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  InvalidIdentityTokenError,
  VALID_IDENTITY_TOKEN,
} from '@lifedeck/application'

const limiter = vi.hoisted(() => ({ blocked: false }))

vi.mock('@/server/api/logger', () => ({ log: vi.fn() }))
vi.mock('@/server/api/auth-guard', async () => {
  const { fail } = await import('@/server/api/respond')
  return {
    enforceAuthRateLimit: () =>
      Promise.resolve(
        limiter.blocked ? fail('RATE_LIMITED', 'slow', 429) : null,
      ),
  }
})

const USER_ID = '11111111-1111-4111-8111-111111111111'
const signInWithApple = vi.fn(
  (input: { identityToken: string; fullName: string | null }) => {
    if (input.identityToken !== VALID_IDENTITY_TOKEN) {
      return Promise.reject(new InvalidIdentityTokenError())
    }
    return Promise.resolve({
      id: USER_ID,
      email: 'apple@example.com',
      displayName: input.fullName ?? 'Friend',
    })
  },
)
vi.mock('@/server/container', () => ({
  getContainer: () => ({
    signInWithApple,
    sessionsValidFrom: () => Promise.resolve(null),
  }),
}))

const { POST } = await import('@/app/api/v1/auth/apple/route')
const { readSessionToken } = await import('@/server/session/session')

function post(body: unknown): Promise<Response> {
  return POST(
    new Request('https://app.test/api/v1/auth/apple', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

beforeEach(() => {
  limiter.blocked = false
  process.env.AUTH_SECRET = 'test-secret-that-is-long-enough-for-hs256'
})

describe('POST /api/v1/auth/apple', () => {
  it('forwards the authorization code so the grant can be revoked later', async () => {
    signInWithApple.mockClear()
    await post({ identityToken: VALID_IDENTITY_TOKEN, authorizationCode: 'c1' })
    expect(signInWithApple.mock.calls[0]?.[0]).toMatchObject({
      authorizationCode: 'c1',
    })
  })

  it('answers with the user and a session token', async () => {
    const response = await post({
      identityToken: VALID_IDENTITY_TOKEN,
      fullName: 'Ana Souza',
    })
    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      data: { email: string; displayName: string }
      token: string
    }
    expect(payload.data).toMatchObject({
      email: 'apple@example.com',
      displayName: 'Ana Souza',
    })
    expect(await readSessionToken(payload.token)).toBe(USER_ID)
  })

  it('refuses a forged token, a missing token and a flood', async () => {
    expect((await post({ identityToken: 'forged' })).status).toBe(401)
    expect((await post({ identityToken: 42 })).status).toBe(422)
    expect((await post('not json')).status).toBe(422)
    limiter.blocked = true
    expect((await post({ identityToken: VALID_IDENTITY_TOKEN })).status).toBe(
      429,
    )
  })

  it('hands other failures to the shared error mapper', async () => {
    signInWithApple.mockRejectedValueOnce(new Error('db down'))
    expect((await post({ identityToken: VALID_IDENTITY_TOKEN })).status).toBe(
      500,
    )
  })
})
