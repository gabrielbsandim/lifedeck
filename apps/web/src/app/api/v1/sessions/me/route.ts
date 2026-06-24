import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const container = getContainer()
    const user = await container.getUser(userId)
    const { plan, entitlements } = await container.entitlements.for(userId)
    return ok({ ...user, plan, entitlements })
  } catch (error) {
    return handleError(error)
  }
}
