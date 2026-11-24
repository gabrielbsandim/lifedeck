import { checkBotId } from 'botid/server'
import { fail } from '@/server/api/respond'
import {
  checkBookingRequestRateLimit,
  checkBookingSlotsRateLimit,
  clientIp,
  rateLimitHeaders,
  type RateLimitResult,
} from '@/server/api/rate-limit'

function limited(result: RateLimitResult): Response {
  return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
    headers: rateLimitHeaders(result),
  })
}

export async function enforceBookingSlotsLimit(
  request: Request,
): Promise<Response | null> {
  const result = await checkBookingSlotsRateLimit(clientIp(request))
  return result.ok ? null : limited(result)
}

export async function enforceBookingRequestLimit(
  request: Request,
  email: string,
): Promise<Response | null> {
  const [byIp, byEmail] = await Promise.all([
    checkBookingRequestRateLimit(`ip:${clientIp(request)}`),
    checkBookingRequestRateLimit(`email:${email.trim().toLowerCase()}`),
  ])
  if (!byIp.ok) {
    return limited(byIp)
  }
  return byEmail.ok ? null : limited(byEmail)
}

type BotCheck = () => Promise<{ isBot: boolean }>

// BotID only works on Vercel, and the client only sends its challenge when the
// same flag is on (instrumentation-client.ts). Checking without the challenge
// would mark every visitor a bot, so both sides follow this one switch.
export async function rejectBot(
  check: BotCheck = checkBotId,
  env: Record<string, string | undefined> = process.env,
): Promise<Response | null> {
  if (env.NEXT_PUBLIC_BOTID_ENABLED !== 'true') {
    return null
  }
  const { isBot } = await check()
  return isBot ? fail('FORBIDDEN', 'Request blocked.', 403) : null
}

// The public form carries a field people never see; anything filled in there
// came from a script, which gets a quiet 202 while nothing is booked.
export function isHoneypotFilled(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) {
    return false
  }
  const value = (body as Record<string, unknown>).website
  return typeof value === 'string' && value.trim() !== ''
}
