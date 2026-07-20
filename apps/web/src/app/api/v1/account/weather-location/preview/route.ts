import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

// Confirms a place before the user saves it as their default weather location.
// Read-only, but session-gated like the rest of the account surface.
export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const result = await getContainer().previewWeatherLocation(body)
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}
