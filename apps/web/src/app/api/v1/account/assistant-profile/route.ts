import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

// Saves the durable assistant memory (home/work, routine hours, brief settings,
// people, notes). Session-gated like the rest of the account surface.
export async function PATCH(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const user = await getContainer().setAssistantProfile(userId, body)
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}
