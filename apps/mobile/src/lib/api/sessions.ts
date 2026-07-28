// Session-issuing calls need the token from the response body (native clients
// have no cookie jar), so they read the `{ data, token }` envelope directly
// instead of the generic apiRequest, and persist the token to the keychain.
import type { GuestSignInInput, UserView } from '@lifedeck/application'
import { API_BASE_URL, API_PREFIX } from './config'
import { ApiError } from './client'
import { setSessionToken } from './session-token'

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

async function issueSession(path: string, body: unknown): Promise<UserView> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
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
