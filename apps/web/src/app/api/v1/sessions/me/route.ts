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
    // Country from the edge, used to pick the billing currency (never the UI
    // language). Absent in local dev; the client falls back to the locale.
    const country = request.headers.get('x-vercel-ip-country')
    return ok({ ...user, plan, entitlements, features, country })
  } catch (error) {
    return handleError(error)
  }
}
