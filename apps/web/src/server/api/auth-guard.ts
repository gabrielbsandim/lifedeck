import { type NextResponse } from 'next/server'
import { fail } from '@/server/api/respond'
import {
  checkAuthRateLimit,
  clientIp,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

export async function enforceAuthRateLimit(
  request: Request,
  scope: string,
  identity: string,
): Promise<NextResponse | null> {
  const result = await checkAuthRateLimit(
    `${scope}:${identity}:${clientIp(request)}`,
  )
  if (!result.ok) {
    return fail(
      'RATE_LIMITED',
      'Too many attempts. Please try again later.',
      429,
      undefined,
      { headers: rateLimitHeaders(result) },
    )
  }
  return null
}
