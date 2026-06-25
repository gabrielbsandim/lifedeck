import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import {
  checkGuestSessionRateLimit,
  clientIp,
  rateLimitHeaders,
} from '@/server/api/rate-limit'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'

export async function POST(request: Request) {
  try {
    const rate = await checkGuestSessionRateLimit(`guest:${clientIp(request)}`)
    if (!rate.ok) {
      return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        headers: rateLimitHeaders(rate),
      })
    }
    const body = await request.json()
    const user = await getContainer().createGuestUser(body)
    const token = await createSessionToken(user.id, new Date())

    const response = ok(user, 201)
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(SESSION_TTL_SECONDS),
    )
    return response
  } catch (error) {
    return handleError(error)
  }
}
