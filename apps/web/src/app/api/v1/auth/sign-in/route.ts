import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, okSession } from '@/server/api/respond'
import { enforceAuthRateLimit } from '@/server/api/auth-guard'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const limited = await enforceAuthRateLimit(request, 'sign-in', email)
    if (limited instanceof NextResponse) {
      return limited
    }
    const user = await getContainer().signInWithEmail(body)
    const token = await createSessionToken(user.id, new Date())

    const response = okSession(user, token)
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_TTL_SECONDS),
    )
    return response
  } catch (error) {
    return handleError(error)
  }
}
