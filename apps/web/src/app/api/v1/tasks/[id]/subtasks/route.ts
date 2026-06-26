import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireScope(request, 'tasks:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { id } = await params
    const subtasks = await getContainer().listSubtasks(auth.userId, id)
    return ok(subtasks)
  } catch (error) {
    return handleError(error)
  }
}

export async function POST(
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
    const subtask = await getContainer().createSubtask(auth.userId, id, body)
    return ok(subtask, 201)
  } catch (error) {
    return handleError(error)
  }
}

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
    const subtasks = await getContainer().reorderSubtasks(auth.userId, id, body)
    return ok(subtasks)
  } catch (error) {
    return handleError(error)
  }
}
