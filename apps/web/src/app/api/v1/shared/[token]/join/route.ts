import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const auth = await requireScope(request, 'lists:write')
    if (auth instanceof NextResponse) {
      return auth
    }
    const { token } = await params
    const member = await getContainer().joinListByToken(auth.userId, token)
    return ok(member, 201)
  } catch (error) {
    return handleError(error)
  }
}
