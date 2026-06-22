import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function POST(request: Request) {
  try {
    const auth = await requireScope(request, 'tasks:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const body = await request.json()
    const task = await getContainer().createTask(auth.userId, body)
    return ok(task, 201)
  } catch (error) {
    return handleError(error)
  }
}
