import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type WindowSpec = `${number} s`

type LimiterConfig = {
  requests: number
  window: WindowSpec
  prefix: string
}

const API_LIMIT: LimiterConfig = {
  requests: 60,
  window: '60 s',
  prefix: 'lifedeck/ratelimit/api',
}

const AUTH_LIMIT: LimiterConfig = {
  requests: 8,
  window: '300 s',
  prefix: 'lifedeck/ratelimit/auth',
}

export type RateLimitResult = {
  ok: boolean
  limit: number
  remaining: number
  reset: number
}

const limiters = new Map<string, Ratelimit | null>()

function getLimiter(config: LimiterConfig): Ratelimit | null {
  const cached = limiters.get(config.prefix)
  if (cached !== undefined) {
    return cached
  }
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    limiters.set(config.prefix, null)
    return null
  }
  const limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    prefix: config.prefix,
    analytics: false,
  })
  limiters.set(config.prefix, limiter)
  return limiter
}

async function check(
  config: LimiterConfig,
  identifier: string,
): Promise<RateLimitResult> {
  const active = getLimiter(config)
  if (!active) {
    return {
      ok: true,
      limit: config.requests,
      remaining: config.requests,
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

export function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  return check(API_LIMIT, identifier)
}

export function checkAuthRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return check(AUTH_LIMIT, identifier)
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(Math.max(0, result.remaining)),
    'x-ratelimit-reset': String(result.reset),
  }
}
