import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import {
  SESSION_COOKIE,
  getUserIdFromRequest,
  sessionCookieOptions,
} from '@/server/session/session'
import { forgetSessionValidity } from '@/server/session/session-validity'

function signedOut() {
  const response = ok({ signedOut: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}

// `?scope=all` also kills the tokens held by every other browser and device.
export async function DELETE(request: Request) {
  const scope = new URL(request.url).searchParams.get('scope')
  if (scope !== 'all') {
    return signedOut()
  }
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    await getContainer().revokeSessions(userId)
    forgetSessionValidity(userId)
    return signedOut()
  } catch (error) {
    return handleError(error)
  }
}
