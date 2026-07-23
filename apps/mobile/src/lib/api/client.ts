// The native transport: no cookie jar, so it authenticates with the session
// JWT as a Bearer header (from SecureStore) and resolves paths against the
// full API base. The request/response contract is shared via @lifedeck/client.
import { getLocales } from 'expo-localization'
import { createApiClient } from '@lifedeck/client'
import { API_BASE_URL, API_PREFIX } from './config'
import { getSessionToken } from './session-token'

const client = createApiClient({
  baseUrl: `${API_BASE_URL}${API_PREFIX}`,
  getLocale: () => getLocales()[0]?.languageTag ?? 'en',
  getToken: getSessionToken,
})

export const apiRequest = client.request
export const apiRequestPage = client.requestPage

export { ApiError, type ApiPage } from '@lifedeck/client'
