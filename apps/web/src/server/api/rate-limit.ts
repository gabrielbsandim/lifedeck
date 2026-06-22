import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const REQUESTS_PER_WINDOW = 60
const WINDOW = '60 s' as const

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  reset: number
}

let limiter: Ratelimit | null | undefined

function getLimiter(): Ratelimit | null {
  if (limiter !== undefined) {
    return limiter
  }
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    limiter = null
    return limiter
  }
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(REQUESTS_PER_WINDOW, WINDOW),
    prefix: 'taskin/ratelimit',
    analytics: false,
  })
  return limiter
}

export async function checkRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  const active = getLimiter()
  if (!active) {
    return {
      ok: true,
      limit: REQUESTS_PER_WINDOW,
      remaining: REQUESTS_PER_WINDOW,
      reset: 0,
    }
  }
  const result = await active.limit(identifier)
  return {
    ok: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(Math.max(0, result.remaining)),
    'x-ratelimit-reset': String(result.reset),
  }
}
