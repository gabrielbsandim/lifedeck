import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import { resolveLocaleFromHeader } from '@/lib/i18n/get-locale'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const appUrl = process.env.APP_URL ?? new URL(request.url).origin
    const locale = resolveLocaleFromHeader(
      request.headers.get('accept-language'),
    )
    const link = await getContainer().inviteToList(
      auth.userId,
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
