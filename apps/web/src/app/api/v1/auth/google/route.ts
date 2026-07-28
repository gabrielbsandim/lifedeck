import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import {
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
} from '@/server/session/oauth-state'
import { nativeAuthState } from '@/server/session/native-auth'

export async function GET(request: Request) {
  // `platform=native` marks the state so the callback hands the session to the
  // app over a single-use code instead of setting a browser cookie.
  const native = new URL(request.url).searchParams.get('platform') === 'native'
  const state = native ? nativeAuthState() : randomUUID()
  const url = getContainer().getGoogleAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions(600))
  return response
}
