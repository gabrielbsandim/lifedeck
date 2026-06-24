import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const requesterId = await getUserIdFromRequest(request)
    if (!requesterId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const { id } = await params
    await getContainer().leaveList(requesterId, id)
    return ok({ left: true })
  } catch (error) {
    return handleError(error)
  }
}
