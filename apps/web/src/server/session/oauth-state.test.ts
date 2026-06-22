import { describe, expect, it } from 'vitest'
import {
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
  parseOAuthStateCookie,
} from '@/server/session/oauth-state'

describe('oauth-state cookie', () => {
  it('builds cookie options with the given max-age', () => {
    const options = oauthStateCookieOptions(600)
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    })
  })

  it('reads the state value from the cookie header', () => {
    const request = new Request('http://localhost', {
      headers: { cookie: `other=1; ${OAUTH_STATE_COOKIE}=abc123` },
    })
    expect(parseOAuthStateCookie(request)).toBe('abc123')
  })

  it('returns null when there is no cookie header', () => {
    expect(parseOAuthStateCookie(new Request('http://localhost'))).toBeNull()
  })

  it('returns null when the state cookie is absent', () => {
    const request = new Request('http://localhost', {
      headers: { cookie: 'other=1' },
    })
    expect(parseOAuthStateCookie(request)).toBeNull()
  })
})
