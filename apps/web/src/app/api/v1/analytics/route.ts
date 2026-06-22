import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const url = new URL(request.url)
    const parsed = Number(url.searchParams.get('days'))
    const days = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
    const analytics = await getContainer().getAnalytics(userId, { days })
    return ok(analytics)
  } catch (error) {
    return handleError(error)
  }
}
