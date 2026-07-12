import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const gate = requireFeature('billing')
    if (gate) {
      return gate
    }
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const subscription = await getContainer().getSubscription(userId)
    return ok({ subscription })
  } catch (error) {
    return handleError(error)
  }
}
