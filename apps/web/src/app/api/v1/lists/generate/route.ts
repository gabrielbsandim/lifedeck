import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import {
  checkGenerateRateLimit,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const rate = await checkGenerateRateLimit(`generate:${userId}`)
    if (!rate.ok) {
      return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        headers: rateLimitHeaders(rate),
      })
    }
    const body = await request.json()
    const draft = await getContainer().generateList(body)
    return ok(draft)
  } catch (error) {
    return handleError(error)
  }
}
