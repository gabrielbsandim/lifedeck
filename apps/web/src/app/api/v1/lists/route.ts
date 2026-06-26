import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok, okPage } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'
import { parseListTypeFilter, parsePageParams } from '@/server/api/pagination'

export async function POST(request: Request) {
  try {
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const body = await request.json()
    const list = await getContainer().createList(auth.userId, body)
    return ok(list, 201)
  } catch (error) {
    return handleError(error)
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireScope(request, 'lists:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const page = await getContainer().listUserLists(auth.userId, {
      ...parsePageParams(request),
      type: parseListTypeFilter(request),
    })
    return okPage(page)
  } catch (error) {
    return handleError(error)
  }
}
