import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function GET(request: Request) {
  try {
    const auth = await requireScope(request, 'tasks:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const date = new URL(request.url).searchParams.get('date') ?? ''
    const board = await getContainer().getDailyBoard(auth.userId, date)
    return ok(board)
  } catch (error) {
    return handleError(error)
  }
}
