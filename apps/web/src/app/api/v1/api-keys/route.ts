import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const keys = await getContainer().listApiKeys(userId)
    return ok(keys)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const created = await getContainer().createApiKey(userId, body)
    return ok(created, 201)
  } catch (error) {
    return handleError(error)
  }
}
