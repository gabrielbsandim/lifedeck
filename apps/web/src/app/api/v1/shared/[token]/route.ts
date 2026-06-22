import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    const board = await getContainer().getSharedBoard(token)
    return ok(board)
  } catch (error) {
    return handleError(error)
  }
}
