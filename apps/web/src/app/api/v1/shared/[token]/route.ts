import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { enforcePublicRateLimit } from '@/server/api/public-guard'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const limited = await enforcePublicRateLimit(request, 'shared')
    if (limited) {
      return limited
    }
    const { token } = await params
    const board = await getContainer().getSharedBoard(token)
    return ok(board)
  } catch (error) {
    return handleError(error)
  }
}
