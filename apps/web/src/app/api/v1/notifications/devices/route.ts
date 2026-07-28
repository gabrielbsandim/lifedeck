import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

// Registers the phone that is signed in as this user for push notifications.
// The app calls it on every start once the OS permission is granted, so it is an
// upsert on the token rather than a create.
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    await getContainer().registerPushDevice(userId, body)
    return ok({ registered: true })
  } catch (error) {
    return handleError(error)
  }
}

// Called on sign-out. The token travels in the body rather than the query string
// so it stays out of access logs and browser history.
export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    await getContainer().unregisterPushDevice(userId, body)
    return ok({ registered: false })
  } catch (error) {
    return handleError(error)
  }
}
