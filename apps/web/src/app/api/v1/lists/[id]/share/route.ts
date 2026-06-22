import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const link = await getContainer().createShareLink(userId, id, body)
    return ok(link, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const { id } = await params
    const links = await getContainer().listShareLinks(userId, id)
    return ok(links)
  } catch (error) {
    return handleError(error)
  }
}
