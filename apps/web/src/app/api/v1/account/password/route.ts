import { getContainer } from '@/server/container'
import { fail, handleError, okSession } from '@/server/api/respond'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  getUserIdFromRequest,
  sessionCookieOptions,
} from '@/server/session/session'
import { forgetSessionValidity } from '@/server/session/session-validity'

// Changing the password revokes every session, so the caller gets a fresh token
// (cookie for the web, body for the app) to stay signed in on this device.
export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const user = await getContainer().changePassword(userId, body)
    forgetSessionValidity(userId)
    const token = await createSessionToken(userId, new Date())
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
