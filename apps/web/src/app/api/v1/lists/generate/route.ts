import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import { isFeatureEnabled } from '@/server/api/features'
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
    const container = getContainer()
    const metered = isFeatureEnabled('v2')
    if (metered) {
      await container.consumeCredits(userId, 'listGeneration')
    }
    try {
      const body = await request.json()
      const draft = await container.generateList(body)
      return ok(draft)
    } catch (error) {
      // The credit was charged before generation; a runtime failure (bad body
      // or model error) must not leave the user billed for nothing.
      if (metered) {
        await container.refundCredits(userId, 'listGeneration').catch(() => {})
      }
      throw error
    }
  } catch (error) {
    return handleError(error)
  }
}
