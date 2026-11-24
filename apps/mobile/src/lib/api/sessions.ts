// Session-issuing calls need the token from the response body (native clients
// have no cookie jar), so they read the `{ data, token }` envelope directly
// instead of the generic apiRequest, and persist the token to the keychain.
import type { GuestSignInInput, UserView } from '@lifedeck/application'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import { ApiError } from '@/lib/api/client'
import { getSessionToken, setSessionToken } from '@/lib/api/session-token'

type SessionEnvelope = { data: UserView; token: string }

async function failFrom(response: Response): Promise<ApiError> {
  let code = 'unknown_error'
  let message = 'Request failed'
  try {
    const payload = (await response.json()) as {
      error?: { code?: string; message?: string }
    }
    if (payload.error) {
      code = payload.error.code ?? code
      message = payload.error.message ?? message
    }
  } catch {
    // non-JSON error body — keep defaults
  }
  return new ApiError(response.status, code, message)
}

async function issueSession(
  path: string,
  body: unknown,
  init: { method: string; authorization?: string } = { method: 'POST' },
): Promise<UserView> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (init.authorization) {
    headers.authorization = init.authorization
  }
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method: init.method,
    headers,
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw await failFrom(response)
  }
  const payload = (await response.json()) as SessionEnvelope
  await setSessionToken(payload.token)
  return payload.data
}

export function createGuestSession(input: GuestSignInInput): Promise<UserView> {
  return issueSession('/sessions/guest', input)
}

export function signInSession(input: {
  email: string
  password: string
}): Promise<UserView> {
  return issueSession('/auth/sign-in', input)
}

// Redeems the single-use code the Google callback deep-linked back with. The
// session token itself never travels through the custom-scheme URL.
export function exchangeNativeAuthCode(code: string): Promise<UserView> {
  return issueSession('/auth/native', { code })
}

// A password change revokes every session, this one included, and answers with
// the replacement token, which has to land in the keychain before the next call.
export async function changePasswordSession(input: {
  currentPassword: string
  newPassword: string
}): Promise<UserView> {
  const token = await getSessionToken()
  return issueSession('/account/password', input, {
    method: 'PATCH',
    authorization: token ? `Bearer ${token}` : undefined,
  })
}
