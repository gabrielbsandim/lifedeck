import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import {
  SESSION_COOKIE,
  getUserIdFromRequest,
  sessionCookieOptions,
} from '@/server/session/session'

export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const user = await getContainer().renameUser(userId, body)
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    await getContainer().deleteUser(userId)
    const response = ok({ deleted: true })
    response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
    return response
  } catch (error) {
    return handleError(error)
  }
}
