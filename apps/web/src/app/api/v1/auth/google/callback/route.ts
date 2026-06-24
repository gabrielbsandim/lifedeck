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
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expectedState = parseOAuthStateCookie(request)

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/?auth=error', request.url))
  }

  try {
    const guestId = await getUserIdFromRequest(request)
    const user = await getContainer().signInWithGoogle(code, guestId)
    const token = await createSessionToken(user.id, new Date())

    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_TTL_SECONDS),
    )
    response.cookies.set(OAUTH_STATE_COOKIE, '', oauthStateCookieOptions(0))
    return response
  } catch {
    return NextResponse.redirect(new URL('/?auth=error', request.url))
  }
}
