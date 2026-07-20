import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

// Mark (or, with { done: false }, un-mark) a habit as done for a civil date,
// defaulting to today. Returns the habit's refreshed streak view.
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
    const body = await request.json().catch(() => ({}))
    const habit = await getContainer().logHabit(auth.userId, id, body)
    return ok(habit)
  } catch (error) {
    return handleError(error)
  }
}
