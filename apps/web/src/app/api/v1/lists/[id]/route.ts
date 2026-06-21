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
    const list = await getContainer().getList(id, userId)
    return ok(list)
  } catch (error) {
    return handleError(error)
  }
}
