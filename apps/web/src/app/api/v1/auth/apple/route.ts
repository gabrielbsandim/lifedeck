import { NextResponse } from 'next/server'
import { InvalidIdentityTokenError } from '@lifedeck/application'
import { getContainer } from '@/server/container'
import { fail, handleError, okSession } from '@/server/api/respond'
import { enforceAuthRateLimit } from '@/server/api/auth-guard'
import {
  createSessionToken,
  getUserIdFromRequest,
} from '@/server/session/session'

const TOKEN_MAX = 8192
const NAME_MAX = 200
const CODE_MAX = 1024

function text(value: unknown, max: number): string | null {
  return typeof value === 'string' && value.length <= max ? value : null
}

// Sign in with Apple from the iOS app. The native sheet hands the app an
// identity token signed by Apple, verified here; the session comes back in the
// body because the app has no cookie jar.
export async function POST(request: Request) {
  try {
    const limited = await enforceAuthRateLimit(request, 'apple-auth', 'ios')
    if (limited instanceof NextResponse) {
      return limited
    }
    const body = (await request.json().catch(() => ({}))) as {
      identityToken?: unknown
      fullName?: unknown
      authorizationCode?: unknown
    }
    const identityToken = text(body.identityToken, TOKEN_MAX)
    if (!identityToken) {
      return fail('VALIDATION_ERROR', 'An identity token is required.', 422)
    }
    const guestId = await getUserIdFromRequest(request)
    const user = await getContainer().signInWithApple(
      {
        identityToken,
        fullName: text(body.fullName, NAME_MAX),
        authorizationCode: text(body.authorizationCode, CODE_MAX),
      },
      guestId,
    )
    const token = await createSessionToken(user.id, new Date())
    return okSession(user, token)
  } catch (error) {
    if (error instanceof InvalidIdentityTokenError) {
      return fail('UNAUTHORIZED', error.message, 401)
    }
    return handleError(error)
  }
}
