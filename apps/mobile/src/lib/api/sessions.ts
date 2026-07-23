// Session-issuing calls need the token from the response body (native clients
// have no cookie jar), so they read the `{ data, token }` envelope directly
// instead of the generic apiRequest, and persist the token to the keychain.
import type { GuestSignInInput, UserView } from '@lifedeck/application'
import { API_BASE_URL, API_PREFIX } from './config'
import { ApiError } from './client'
import { setSessionToken } from './session-token'

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

export async function createGuestSession(
  input: GuestSignInInput,
): Promise<UserView> {
  const response = await fetch(`${API_BASE_URL}${API_PREFIX}/sessions/guest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!response.ok) {
    throw await failFrom(response)
  }
  const payload = (await response.json()) as { data: UserView; token: string }
  await setSessionToken(payload.token)
  return payload.data
}
