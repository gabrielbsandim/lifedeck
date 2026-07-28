import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { fail, handleError, okSession } from '@/server/api/respond'
import { enforceAuthRateLimit } from '@/server/api/auth-guard'
import { claimNativeAuthCode } from '@/server/session/native-auth'
import { readSessionToken } from '@/server/session/session'

// Exchanges the single-use code the Google callback deep-linked to the app for
// the real session token. The code is consumed on read, so a replay fails.
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown }
    const code = typeof body.code === 'string' ? body.code.trim() : ''
    if (!code) {
      return fail('VALIDATION_ERROR', 'A code is required.', 422)
    }
    const limited = await enforceAuthRateLimit(request, 'native-auth', code)
    if (limited instanceof NextResponse) {
      return limited
    }
    const token = await claimNativeAuthCode(code)
    const userId = token ? await readSessionToken(token) : null
    if (!token || !userId) {
      return fail('UNAUTHORIZED', 'The sign-in code is invalid.', 401)
    }
    const user = await getContainer().getUser(userId)
    return okSession(user, token)
  } catch (error) {
    return handleError(error)
  }
}
