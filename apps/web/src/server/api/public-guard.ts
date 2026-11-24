import { fail } from '@/server/api/respond'
import {
  checkPublicRateLimit,
  clientIp,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

export async function enforcePublicRateLimit(
  request: Request,
  scope: string,
): Promise<Response | null> {
  const result = await checkPublicRateLimit(`${scope}:${clientIp(request)}`)
  if (result.ok) {
    return null
  }
  return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
    headers: rateLimitHeaders(result),
  })
}
