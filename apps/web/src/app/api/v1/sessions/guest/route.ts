import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  sessionCookieOptions,
} from '@/server/session/session'

export async function POST(request: Request) {
  try {
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
