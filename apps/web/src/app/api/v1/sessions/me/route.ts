import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import { isFeatureEnabled } from '@/server/api/features'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const container = getContainer()
    const user = await container.getUser(userId)
    const { plan, entitlements } = await container.entitlements.for(userId)
    const features = {
      calendar: isFeatureEnabled('calendar'),
      whatsapp: isFeatureEnabled('whatsapp'),
      billing: isFeatureEnabled('billing'),
    }
    return ok({ ...user, plan, entitlements, features })
  } catch (error) {
    return handleError(error)
  }
}
