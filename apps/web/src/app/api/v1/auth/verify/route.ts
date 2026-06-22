import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { enforceAuthRateLimit } from '@/server/api/auth-guard'
import { getUserIdFromRequest } from '@/server/session/session'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const limited = await enforceAuthRateLimit(request, 'verify', userId)
    if (limited instanceof NextResponse) {
      return limited
    }
    const body = await request.json()
    const user = await getContainer().verifyEmail(userId, body)
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}
