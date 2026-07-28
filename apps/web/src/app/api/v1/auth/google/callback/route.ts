import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'
import {
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
  parseOAuthStateCookie,
} from '@/server/session/oauth-state'
import {
  isNativeAuthState,
  issueNativeAuthCode,
  nativeAuthRedirect,
} from '@/server/session/native-auth'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expectedState = parseOAuthStateCookie(request)
  const native = isNativeAuthState(state)

  function failure(): NextResponse {
    return native
      ? NextResponse.redirect(nativeAuthRedirect({ error: 'auth_failed' }))
      : NextResponse.redirect(new URL('/?auth=error', request.url))
  }

  if (!code || !state || state !== expectedState) {
    return failure()
  }

  try {
    const guestId = await getUserIdFromRequest(request)
    const user = await getContainer().signInWithGoogle(code, guestId)
    const token = await createSessionToken(user.id, new Date())

    if (native) {
      // The app has no cookie jar, and a session token in a custom-scheme URL
      // is interceptable, so hand over a single-use code it exchanges over
      // HTTPS instead.
      const handoff = await issueNativeAuthCode(token)
      if (!handoff) {
        return failure()
      }
      const response = NextResponse.redirect(
        nativeAuthRedirect({ code: handoff }),
      )
      response.cookies.set(OAUTH_STATE_COOKIE, '', oauthStateCookieOptions(0))
      return response
    }

    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_TTL_SECONDS),
    )
    response.cookies.set(OAUTH_STATE_COOKIE, '', oauthStateCookieOptions(0))
    return response
  } catch {
    return failure()
  }
}
