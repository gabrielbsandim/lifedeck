import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok, okPage } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import { parsePageParams } from '@/server/api/pagination'

export async function POST(request: Request) {
  try {
    const auth = await requireScope(request, 'tasks:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const body = await request.json()
    const definition = await getContainer().createRecurringTask(
      auth.userId,
      body,
    )
    return ok(definition, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireScope(request, 'tasks:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const page = await getContainer().listRecurringTasks(
      auth.userId,
      parsePageParams(request),
    )
    return okPage(page)
  } catch (error) {
    return handleError(error)
  }
}
