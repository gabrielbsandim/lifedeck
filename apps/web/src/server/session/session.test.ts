// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getUserIdFromRequest,
  parseSessionBearer,
  parseSessionCookie,
  readSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'
import { clearSessionValidityCache } from '@/server/session/session-validity'
import { SignJWT } from 'jose'

const sessionsValidFrom = vi.fn<(userId: string) => Promise<Date | null>>()

vi.mock('@/server/container', () => ({
  getContainer: () => ({ sessionsValidFrom }),
}))

const USER_ID = 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f'
const ISSUED_AT = new Date('2026-06-21T10:00:00.000Z')

function requestWithCookie(cookie: string): Request {
  return new Request('https://lifedeck.app/api/v1/sessions/me', {
    headers: { cookie },
  })
}

function requestWithAuthorization(authorization: string): Request {
  return new Request('https://lifedeck.app/api/v1/sessions/me', {
    headers: { authorization },
  })
}

describe('session', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret-value-for-signing-tokens'
    vi.useFakeTimers()
    vi.setSystemTime(ISSUED_AT)
    clearSessionValidityCache()
    sessionsValidFrom.mockReset()
    sessionsValidFrom.mockResolvedValue(null)
  })

  afterEach(() => {
    delete process.env.AUTH_SECRET
    vi.useRealTimers()
  })

  it('round-trips a signed token', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    expect(await readSessionToken(token)).toBe(USER_ID)
  })

  it('rejects a token issued before the sessions were revoked', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    sessionsValidFrom.mockResolvedValue(new Date(ISSUED_AT.getTime() + 1000))
    expect(await readSessionToken(token)).toBeNull()
    expect(sessionsValidFrom).toHaveBeenCalledWith(USER_ID)
  })

  it('accepts a token issued in the same second as the revocation', async () => {
    sessionsValidFrom.mockResolvedValue(new Date(ISSUED_AT.getTime() + 400))
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    expect(await readSessionToken(token)).toBe(USER_ID)
  })

  it('looks the revocation up once per minute per user', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    await readSessionToken(token)
    await readSessionToken(token)
    expect(sessionsValidFrom).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_001)
    await readSessionToken(token)
    expect(sessionsValidFrom).toHaveBeenCalledTimes(2)
  })

  it('propagates a failed revocation lookup instead of signing out', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    sessionsValidFrom.mockRejectedValue(new Error('db down'))
    await expect(readSessionToken(token)).rejects.toThrow('db down')
  })

  it('rejects a token without an issue time', async () => {
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .sign(new TextEncoder().encode(process.env.AUTH_SECRET))
    expect(await readSessionToken(token)).toBeNull()
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
    const request = new Request('https://lifedeck.app/api/v1/sessions/me')
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
    const request = new Request('https://lifedeck.app/api/v1/sessions/me')
    expect(await getUserIdFromRequest(request)).toBeNull()
  })

  it('reads the user id from a Bearer session token', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const request = requestWithAuthorization(`Bearer ${token}`)
    expect(await getUserIdFromRequest(request)).toBe(USER_ID)
  })

  it('falls back to the Bearer token when the cookie is invalid', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const request = new Request('https://lifedeck.app/api/v1/sessions/me', {
      headers: {
        cookie: `${SESSION_COOKIE}=not.a.jwt`,
        authorization: `Bearer ${token}`,
      },
    })
    expect(await getUserIdFromRequest(request)).toBe(USER_ID)
  })

  it('ignores an API key sent as a Bearer token', () => {
    const request = requestWithAuthorization('Bearer tk_live_abc123')
    expect(parseSessionBearer(request)).toBeNull()
  })

  it('ignores a non-Bearer authorization header', () => {
    const request = requestWithAuthorization('Basic dXNlcjpwYXNz')
    expect(parseSessionBearer(request)).toBeNull()
  })

  it('returns null for an empty Bearer token', () => {
    const request = requestWithAuthorization('Bearer ')
    expect(parseSessionBearer(request)).toBeNull()
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
