import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { optionalUserId, requireScope } from '@/server/api/authenticate'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const userId = await optionalUserId(request, 'lists:read')
    const list = await getContainer().getList(id, userId)
    return ok(list)
  } catch (error) {
    return handleError(error)
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const body = await request.json()
    const list = await getContainer().renameList(auth.userId, id, body)
    return ok(list)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    await getContainer().deleteList(auth.userId, id)
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
