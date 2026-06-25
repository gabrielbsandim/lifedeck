import { NextResponse } from 'next/server'
import { getContainer, googleCalendarRedirectUri } from '@/server/container'
import { isFeatureEnabled } from '@/server/api/features'
import { requireEntitlement } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'
import { oauthStateCookieOptions } from '@/server/session/oauth-state'
import { CALENDAR_OAUTH_STATE_COOKIE } from '@/server/calendar/oauth-cookie'

function readStateCookie(request: Request): string | null {
  const header = request.headers.get('cookie')
  if (!header) {
    return null
  }
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === CALENDAR_OAUTH_STATE_COOKIE) {
      return decodeURIComponent(rest.join('='))
    }
  }
  return null
}

export async function GET(request: Request) {
  if (!isFeatureEnabled('calendar')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expectedState = readStateCookie(request)

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(
      new URL('/calendar?calendar=error', request.url),
    )
  }

  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.redirect(new URL('/?auth=required', request.url))
    }
    if (await requireEntitlement(userId, 'calendarSync')) {
      return NextResponse.redirect(
        new URL('/calendar?calendar=error', request.url),
      )
    }

    const container = getContainer()
    await container.connectGoogleCalendar(
      userId,
      code,
      googleCalendarRedirectUri(),
    )

    // Opening the watch channel and the first pull are best-effort: a failure
    // here must not block the connection from being saved.
    try {
      await container.watchGoogleCalendar(
        userId,
        `${url.origin}/api/v1/webhooks/google`,
      )
      await container.pullCalendarChanges(userId)
    } catch {
      // sync set-up will be retried by the periodic reconcile
    }

    const response = NextResponse.redirect(
      new URL('/calendar?calendar=connected', request.url),
    )
    response.cookies.set(
      CALENDAR_OAUTH_STATE_COOKIE,
      '',
      oauthStateCookieOptions(0),
    )
    return response
  } catch {
    return NextResponse.redirect(
      new URL('/calendar?calendar=error', request.url),
    )
  }
}
