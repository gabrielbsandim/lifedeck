// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { User, asEntityId } from '@lifedeck/domain'
import {
  FakePasswordHasher,
  InMemorySessionRevocationStore,
  InMemoryUserRepository,
  makeChangePassword,
  makeRevokeSessions,
} from '@lifedeck/application'

const USER_ID = 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f'
const ISSUED_AT = new Date('2026-06-21T10:00:00.000Z')
const CHANGED_AT = new Date('2026-06-21T11:00:00.000Z')

const users = new InMemoryUserRepository()
const hasher = new FakePasswordHasher()
const sessions = new InMemorySessionRevocationStore()
const clock = { now: () => CHANGED_AT }
const container = {
  changePassword: makeChangePassword({ users, hasher, sessions, clock }),
  revokeSessions: makeRevokeSessions({ sessions, clock }),
  sessionsValidFrom: (userId: string) => sessions.validFrom(asEntityId(userId)),
}

vi.mock('@/server/container', () => ({ getContainer: () => container }))
vi.mock('@/server/api/logger', () => ({ log: vi.fn() }))

const { PATCH } = await import('@/app/api/v1/account/password/route')
const { DELETE } = await import('@/app/api/v1/sessions/route')
const { createSessionToken, SESSION_COOKIE } = await import(
  '@/server/session/session'
)
const { clearSessionValidityCache } = await import(
  '@/server/session/session-validity'
)

function changePassword(token: string, newPassword: string): Promise<Response> {
  return PATCH(
    new Request('https://app.test/api/v1/account/password', {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ currentPassword: 'oldpassword', newPassword }),
    }),
  )
}

function signOut(query: string, token?: string): Promise<Response> {
  return DELETE(
    new Request(`https://app.test/api/v1/sessions${query}`, {
      method: 'DELETE',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    }),
  )
}

beforeEach(async () => {
  process.env.AUTH_SECRET = 'test-secret-value-for-signing-tokens'
  vi.useFakeTimers()
  vi.setSystemTime(CHANGED_AT)
  clearSessionValidityCache()
  const user = User.createGuest({
    id: asEntityId(USER_ID),
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: ISSUED_AT,
  })
  user.register({
    email: 'gab@example.com',
    passwordHash: await hasher.hash('oldpassword'),
    emailVerifiedAt: ISSUED_AT,
  })
  await users.save(user)
  await sessions.revokeAll(asEntityId(USER_ID), new Date(0))
})

afterEach(() => {
  delete process.env.AUTH_SECRET
  vi.useRealTimers()
})

describe('PATCH /api/v1/account/password', () => {
  it('revokes the old token and hands this device a new one', async () => {
    const oldToken = await createSessionToken(USER_ID, ISSUED_AT)

    const response = await changePassword(oldToken, 'brandnewpass')
    expect(response.status).toBe(200)
    const body = (await response.json()) as { token: string }
    expect(response.headers.get('set-cookie')).toContain(
      `${SESSION_COOKIE}=${body.token}`,
    )

    const replay = await changePassword(oldToken, 'anotherpass1')
    expect(replay.status).toBe(401)
    const withNewToken = await changePassword(body.token, 'anotherpass1')
    expect(withNewToken.status).not.toBe(401)
  })

  it('rejects an anonymous caller', async () => {
    const response = await PATCH(
      new Request('https://app.test/api/v1/account/password', {
        method: 'PATCH',
        body: '{}',
      }),
    )
    expect(response.status).toBe(401)
  })

  it('keeps the sessions when the current password is wrong', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const response = await PATCH(
      new Request('https://app.test/api/v1/account/password', {
        method: 'PATCH',
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currentPassword: 'wrongpassword',
          newPassword: 'brandnewpass',
        }),
      }),
    )
    expect(response.status).toBe(422)
    expect(await sessions.validFrom(asEntityId(USER_ID))).toEqual(new Date(0))
  })
})

describe('DELETE /api/v1/sessions', () => {
  it('clears only the cookie by default', async () => {
    const response = await signOut('')
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=;`)
    expect(await sessions.validFrom(asEntityId(USER_ID))).toEqual(new Date(0))
  })

  it('revokes every session with scope=all', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const response = await signOut('?scope=all', token)
    expect(response.status).toBe(200)
    expect(await sessions.validFrom(asEntityId(USER_ID))).toEqual(CHANGED_AT)
    expect((await signOut('?scope=all', token)).status).toBe(401)
  })

  it('fails with a 500 when the revocation cannot be stored', async () => {
    const token = await createSessionToken(USER_ID, ISSUED_AT)
    const revoke = vi
      .spyOn(container, 'revokeSessions')
      .mockRejectedValueOnce(new Error('db down'))
    const response = await signOut('?scope=all', token)
    expect(response.status).toBe(500)
    revoke.mockRestore()
  })
})
