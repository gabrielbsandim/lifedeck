import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'
import { oauthStateCookieOptions } from '@/server/session/oauth-state'
import { CALENDAR_OAUTH_STATE_COOKIE } from '@/server/calendar/oauth-cookie'

export async function GET(request: Request) {
  const gate = requireFeature('calendar')
  if (gate) {
    return gate
  }
  const userId = await getUserIdFromRequest(request)
  if (!userId) {
    return NextResponse.redirect(new URL('/?auth=required', request.url))
  }

  const state = randomUUID()
  const url = getContainer().googleCalendarAuthUrl(state)
  const response = NextResponse.redirect(url)
  response.cookies.set(
    CALENDAR_OAUTH_STATE_COOKIE,
    state,
    oauthStateCookieOptions(600),
  )
  return response
}
