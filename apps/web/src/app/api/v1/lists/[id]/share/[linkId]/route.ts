import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; linkId: string }> },
) {
  try {
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { linkId } = await params
    await getContainer().revokeShareLink(auth.userId, linkId)
    return ok({ revoked: true })
  } catch (error) {
    return handleError(error)
  }
}
