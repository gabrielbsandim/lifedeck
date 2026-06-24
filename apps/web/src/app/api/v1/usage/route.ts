import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const gate = requireFeature('v2')
    if (gate) {
      return gate
    }
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const usage = await getContainer().getUsage(userId)
    return ok(usage)
  } catch (error) {
    return handleError(error)
  }
}
