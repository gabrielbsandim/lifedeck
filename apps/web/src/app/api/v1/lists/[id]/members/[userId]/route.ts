import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const requesterId = await getUserIdFromRequest(request)
    if (!requesterId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const { id, userId } = await params
    await getContainer().removeMember(requesterId, id, userId)
    return ok({ removed: true })
  } catch (error) {
    return handleError(error)
  }
}
