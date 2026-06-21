// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getUserIdFromRequest,
  parseSessionCookie,
  readSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'

const USER_ID = 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f'
const ISSUED_AT = new Date('2026-06-21T10:00:00.000Z')

function requestWithCookie(cookie: string): Request {
  return new Request('https://taskin.app/api/v1/sessions/me', {
    headers: { cookie },
  })
}

describe('session', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-value-for-signing-tokens'
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
  })

  it('round-trips a signed token', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    expect(await readSessionToken(token)).toBe(USER_ID)
  })

  it('rejects a tampered token', async () => {
    expect(await readSessionToken('not.a.jwt')).toBeNull()
  })

  it('rejects a token signed with another secret', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    process.env.AUTH_SECRET = 'a-totally-different-secret-value'
    expect(await readSessionToken(token)).toBeNull()
  })

  it('throws when AUTH_SECRET is missing', async () => {
    delete process.env.AUTH_SECRET
    await expect(createSessionToken(USER_ID, ISSUED_AT)).rejects.toThrow(
      'AUTH_SECRET',
    )
  })

  it('parses the session cookie among others', () => {
    const cookie = `theme=dark; ${SESSION_COOKIE}=abc123; lang=en`
    expect(parseSessionCookie(requestWithCookie(cookie))).toBe('abc123')
  })

  it('returns null when no cookie header is present', () => {
    const request = new Request('https://taskin.app/api/v1/sessions/me')
    expect(parseSessionCookie(request)).toBeNull()
  })

  it('returns null when the session cookie is absent', () => {
    expect(parseSessionCookie(requestWithCookie('theme=dark'))).toBeNull()
  })

  it('reads the user id from a request cookie', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const request = requestWithCookie(`${SESSION_COOKIE}=${token}`)
    expect(await getUserIdFromRequest(request)).toBe(USER_ID)
  })

  it('returns null from a request without a session', async () => {
    const request = new Request('https://taskin.app/api/v1/sessions/me')
    expect(await getUserIdFromRequest(request)).toBeNull()
  })

  it('builds hardened cookie options', () => {
    const options = sessionCookieOptions(SESSION_TTL_SECONDS)
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    })
  })

  it('marks the cookie secure in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(sessionCookieOptions(SESSION_TTL_SECONDS).secure).toBe(true)
    vi.unstubAllEnvs()
  })

  it('leaves the cookie non-secure outside production', () => {
    vi.stubEnv('NODE_ENV', 'test')
    expect(sessionCookieOptions(SESSION_TTL_SECONDS).secure).toBe(false)
    vi.unstubAllEnvs()
  })
})
