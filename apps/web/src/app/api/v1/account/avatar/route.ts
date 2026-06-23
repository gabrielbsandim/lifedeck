import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

const MAX_BYTES = 512 * 1024

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const contentType = request.headers.get('content-type') ?? ''
    const buffer = await request.arrayBuffer()
    if (buffer.byteLength > MAX_BYTES) {
      return fail(
        'VALIDATION_ERROR',
        'The image must be 512 KB or smaller.',
        422,
      )
    }
    const user = await getContainer().setAvatar(userId, {
      data: new Uint8Array(buffer),
      contentType,
    })
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const user = await getContainer().removeAvatar(userId)
    return ok(user)
  } catch (error) {
    return handleError(error)
  }
}
