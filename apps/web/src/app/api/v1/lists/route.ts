import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

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
    const lists = await getContainer().listUserLists(auth.userId)
    return ok(lists)
  } catch (error) {
    return handleError(error)
  }
}
