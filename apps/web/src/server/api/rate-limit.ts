import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { log } from '@/server/api/logger'

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

const SESSION_LIMIT: LimiterConfig = {
  requests: 240,
  window: '60 s',
  prefix: 'lifedeck/ratelimit/session',
}

const GENERATE_LIMIT: LimiterConfig = {
  requests: 6,
  window: '60 s',
  prefix: 'lifedeck/ratelimit/generate',
}

const WHATSAPP_LIMIT: LimiterConfig = {
  requests: 10,
  window: '60 s',
  prefix: 'lifedeck/ratelimit/whatsapp',
}

const GUEST_LIMIT: LimiterConfig = {
  requests: 5,
  window: '60 s',
  prefix: 'lifedeck/ratelimit/guest',
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
  const open: RateLimitResult = {
    ok: true,
    limit: config.requests,
    remaining: config.requests,
    reset: 0,
  }
  if (!active) {
    return open
  }
  try {
    const result = await active.limit(identifier)
    return {
      ok: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    // A transient Redis outage must not take down sign-in, registration and AI
    // generation for every user. Fail open (allow the request) and record the
    // incident so the outage is visible.
    log('error', 'rate limit check failed; failing open', {
      prefix: config.prefix,
      error: error instanceof Error ? error.message : String(error),
    })
    return open
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

export function checkSessionRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return check(SESSION_LIMIT, identifier)
}

export function checkGenerateRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return check(GENERATE_LIMIT, identifier)
}

export function checkWhatsappRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return check(WHATSAPP_LIMIT, identifier)
}

export function checkGuestSessionRateLimit(
  identifier: string,
): Promise<RateLimitResult> {
  return check(GUEST_LIMIT, identifier)
}

export function clientIp(request: Request): string {
  // Prefer x-real-ip: on Vercel it is set by the platform proxy and cannot be
  // spoofed by the client, whereas the leftmost x-forwarded-for entry is
  // attacker-controlled and would let a single caller evade the per-IP bucket.
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) {
    return realIp
  }
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) {
      return first
    }
  }
  return 'unknown'
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    'x-ratelimit-limit': String(result.limit),
    'x-ratelimit-remaining': String(Math.max(0, result.remaining)),
    'x-ratelimit-reset': String(result.reset),
  }
}
