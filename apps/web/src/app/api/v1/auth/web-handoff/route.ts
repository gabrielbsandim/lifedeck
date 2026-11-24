import { NextResponse } from 'next/server'
import { fail, handleError, ok } from '@/server/api/respond'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  getUserIdFromRequest,
  readSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'
import {
  claimWebHandoffCode,
  issueWebHandoffCode,
  webHandoffDestination,
  webHandoffUrl,
} from '@/server/session/web-handoff'

// The signed-in app asks for a URL that opens a web page as the same account.
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = (await request.json().catch(() => ({}))) as { next?: unknown }
    const destination = webHandoffDestination(body.next)
    if (!destination) {
      return fail('VALIDATION_ERROR', 'Unsupported destination.', 422)
    }
    const code = await issueWebHandoffCode(userId, new Date())
    if (!code) {
      return fail(
        'SERVICE_UNAVAILABLE',
        'Handoff is unavailable right now.',
        503,
      )
    }
    const origin = new URL(request.url).origin
    return ok({ url: webHandoffUrl(origin, code, destination) })
  } catch (error) {
    return handleError(error)
  }
}

// The system browser lands here, trades the code for a session cookie and goes
// on to the page. A spent or forged code falls back to sign-in for that page.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const destination = webHandoffDestination(url.searchParams.get('next')) ?? '/'
  const code = url.searchParams.get('code') ?? ''
  const token = code ? await claimWebHandoffCode(code) : null
  const userId = token ? await readSessionToken(token) : null
  if (!token || !userId) {
    const signIn = new URL('/', request.url)
    signIn.searchParams.set('returnTo', destination)
    return NextResponse.redirect(signIn, 303)
  }
  const response = NextResponse.redirect(new URL(destination, request.url), 303)
  response.cookies.set(
    SESSION_COOKIE,
    token,
    sessionCookieOptions(SESSION_TTL_SECONDS),
  )
  return response
}
