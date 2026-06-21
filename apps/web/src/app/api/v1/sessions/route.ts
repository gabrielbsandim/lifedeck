import { ok } from '@/server/api/respond'
import { SESSION_COOKIE, sessionCookieOptions } from '@/server/session/session'

export async function DELETE() {
  const response = ok({ signedOut: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
