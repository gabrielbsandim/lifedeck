import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const date = new URL(request.url).searchParams.get('date') ?? ''
    const board = await getContainer().getDailyBoard(userId, date)
    return ok(board)
  } catch (error) {
    return handleError(error)
  }
}
