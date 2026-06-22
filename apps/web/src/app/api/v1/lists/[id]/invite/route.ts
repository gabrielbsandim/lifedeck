import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'

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
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin
    const locale = resolveLocaleFromHeader(
      request.headers.get('accept-language'),
    )
    const link = await getContainer().inviteToList(
      userId,
      id,
      body,
      appUrl,
      locale,
    )
    return ok(link, 201)
  } catch (error) {
    return handleError(error)
  }
}
