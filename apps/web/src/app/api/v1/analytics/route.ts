import { NextResponse } from 'next/server'
import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireScope } from '@/server/api/authenticate'

export async function GET(request: Request) {
  try {
    const auth = await requireScope(request, 'analytics:read')
    if (auth instanceof NextResponse) {
      return auth
    }
    const url = new URL(request.url)
    const parsed = Number(url.searchParams.get('days'))
    const days = Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
    const analytics = await getContainer().getAnalytics(auth.userId, { days })
    return ok(analytics)
  } catch (error) {
    return handleError(error)
  }
}
