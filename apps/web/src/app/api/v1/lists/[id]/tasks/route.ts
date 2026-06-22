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
    const userId = await optionalUserId(request, 'tasks:read')
    const tasks = await getContainer().listListTasks(userId, id)
    return ok(tasks)
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
    const auth = await requireScope(request, 'tasks:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const body = await request.json()
    const tasks = await getContainer().reorderTasks(auth.userId, id, body)
    return ok(tasks)
  } catch (error) {
    return handleError(error)
  }
}
