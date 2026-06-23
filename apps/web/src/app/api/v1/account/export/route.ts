import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { fail, handleError } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'

export async function GET(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const data = await getContainer().exportUserData(userId, new Date())
    return new NextResponse(JSON.stringify({ data }, null, 2), {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="lifedeck-export.json"',
      },
    })
  } catch (error) {
    return handleError(error)
  }
}
