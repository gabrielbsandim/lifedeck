import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import {
  OAUTH_STATE_COOKIE,
  oauthStateCookieOptions,
} from '@/server/session/oauth-state'

export async function GET() {
  const state = randomUUID()
  const url = getContainer().getGoogleAuthUrl(state)

  const response = NextResponse.redirect(url)
  response.cookies.set(OAUTH_STATE_COOKIE, state, oauthStateCookieOptions(600))
  return response
}
