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
    const task = await getContainer().updateTask(auth.userId, id, body)
    return ok(task)
  } catch (error) {
    return handleError(error)
  }
}
