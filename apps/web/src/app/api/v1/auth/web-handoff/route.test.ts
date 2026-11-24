// @vitest-environment node
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

vi.mock('@upstash/redis', () => ({ Redis: vi.fn(() => redis) }))
vi.mock('@/server/api/logger', () => ({ log: vi.fn() }))
vi.mock('@/server/container', () => ({
  getContainer: () => ({ sessionsValidFrom: () => Promise.resolve(null) }),
}))

const { GET, POST } = await import('@/app/api/v1/auth/web-handoff/route')
const { createSessionToken, readSessionToken, SESSION_COOKIE } = await import(
  '@/server/session/session'
)
const { resetNativeAuthClient } = await import('@/server/session/native-auth')

const ORIGIN = 'https://app.test'

async function bearer(userId = 'user-1'): Promise<string> {
  return `Bearer ${await createSessionToken(userId, new Date())}`
}

async function requestHandoff(
  body: unknown,
  authorization?: string,
): Promise<Response> {
  return POST(
    new Request(`${ORIGIN}/api/v1/auth/web-handoff`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify(body),
    }),
  )
}

function redeem(query: string): Promise<Response> {
  return GET(new Request(`${ORIGIN}/api/v1/auth/web-handoff?${query}`))
}

function sessionCookie(response: Response): string | null {
  const header = response.headers.get('set-cookie') ?? ''
  const match = new RegExp(`${SESSION_COOKIE}=([^;]+)`).exec(header)
  const value = match?.[1]
  return value ? decodeURIComponent(value) : null
}

beforeEach(() => {
  store.clear()
  resetNativeAuthClient()
  process.env.AUTH_SECRET = 'test-secret-that-is-long-enough-for-hs256'
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token'
})

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL
  delete process.env.UPSTASH_REDIS_REST_TOKEN
  resetNativeAuthClient()
  vi.clearAllMocks()
})

describe('POST /api/v1/auth/web-handoff', () => {
  it('requires a session', async () => {
    const response = await requestHandoff({ next: '/settings/billing' })
    expect(response.status).toBe(401)
  })

  it('rejects a destination outside the allow list', async () => {
    const response = await requestHandoff(
      { next: 'https://evil.test' },
      await bearer(),
    )
    expect(response.status).toBe(422)
  })

  it('treats a missing body as an unsupported destination', async () => {
    const response = await POST(
      new Request(`${ORIGIN}/api/v1/auth/web-handoff`, {
        method: 'POST',
        headers: { authorization: await bearer() },
        body: 'not json',
      }),
    )
    expect(response.status).toBe(422)
  })

  it('answers 503 when the code store is down', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL
    resetNativeAuthClient()
    const response = await requestHandoff(
      { next: '/settings/billing' },
      await bearer(),
    )
    expect(response.status).toBe(503)
  })

  it('returns a one-minute URL on the same origin', async () => {
    const response = await requestHandoff(
      { next: '/settings/billing' },
      await bearer(),
    )
    const { data } = (await response.json()) as { data: { url: string } }
    const url = new URL(data.url)

    expect(url.origin).toBe(ORIGIN)
    expect(url.pathname).toBe('/api/v1/auth/web-handoff')
    expect(url.searchParams.get('next')).toBe('/settings/billing')
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('lifedeck/web-handoff/'),
      expect.any(String),
      { ex: 60 },
    )
  })
})

describe('GET /api/v1/auth/web-handoff', () => {
  async function issuedQuery(userId = 'user-1'): Promise<string> {
    const response = await requestHandoff(
      { next: '/settings/billing' },
      await bearer(userId),
    )
    const { data } = (await response.json()) as { data: { url: string } }
    return new URL(data.url).search.slice(1)
  }

  it('signs the browser in as the same account and opens the page', async () => {
    const response = await redeem(await issuedQuery('user-42'))

    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`${ORIGIN}/settings/billing`)
    const token = sessionCookie(response)
    expect(token).not.toBeNull()
    await expect(readSessionToken(token as string)).resolves.toBe('user-42')
  })

  it('works once: a replayed code falls back to sign-in', async () => {
    const query = await issuedQuery()
    await redeem(query)
    const replay = await redeem(query)

    expect(replay.headers.get('location')).toBe(
      `${ORIGIN}/?returnTo=%2Fsettings%2Fbilling`,
    )
    expect(sessionCookie(replay)).toBeNull()
  })

  it('never redirects off the allow list', async () => {
    const response = await redeem('code=forged&next=https://evil.test')
    expect(response.headers.get('location')).toBe(`${ORIGIN}/?returnTo=%2F`)
  })

  it('sends a request without a code to sign-in', async () => {
    const response = await redeem('next=/settings/billing')
    expect(response.headers.get('location')).toBe(
      `${ORIGIN}/?returnTo=%2Fsettings%2Fbilling`,
    )
  })

  it('refuses a stored value that is not a valid session', async () => {
    store.set('lifedeck/web-handoff/bad', 'not-a-jwt')
    const response = await redeem('code=bad&next=/settings/billing')
    expect(sessionCookie(response)).toBeNull()
  })
})
