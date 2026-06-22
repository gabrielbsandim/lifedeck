import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const { linkId } = await params
    await getContainer().revokeShareLink(userId, linkId)
    return ok({ revoked: true })
  } catch (error) {
    return handleError(error)
  }
}
