import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    const tasks = await getContainer().listListTasks(userId, id)
    return ok(tasks)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const body = await request.json()
    const tasks = await getContainer().reorderTasks(userId, id, body)
    return ok(tasks)
  } catch (error) {
    return handleError(error)
  }
}
