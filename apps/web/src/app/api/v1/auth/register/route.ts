import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { enforceAuthRateLimit } from '@/server/api/auth-guard'
import { getUserIdFromRequest } from '@/server/session/session'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const limited = await enforceAuthRateLimit(request, 'register', userId)
    if (limited instanceof NextResponse) {
      return limited
    }
    const body = await request.json()
    const locale = resolveLocaleFromHeader(
      request.headers.get('accept-language'),
    )
    const user = await getContainer().registerWithEmail(userId, body, locale)
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}
