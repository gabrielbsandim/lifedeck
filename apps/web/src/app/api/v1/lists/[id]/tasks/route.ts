import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
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
