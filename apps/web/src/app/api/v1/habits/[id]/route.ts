import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'tasks:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    const body = await request.json()
    const habit = await getContainer().updateHabit(auth.userId, id, body)
    return ok(habit)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'tasks:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    await getContainer().deleteHabit(auth.userId, id)
    return ok({ deleted: true })
  } catch (error) {
    return handleError(error)
  }
}
