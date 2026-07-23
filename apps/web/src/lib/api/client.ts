// The web transport: cookie auth (`credentials: 'include'`) + the browser
// language. The request/response contract lives in @lifedeck/client and is
// shared with the native app; only the injected transport differs. Existing
// importers keep using `apiRequest` / `apiRequestPage` / `ApiError` unchanged.
import { createApiClient } from '@lifedeck/client'

function browserLanguage(): string | undefined {
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language
  }
  return undefined
}

const client = createApiClient({
  credentials: 'include',
  getLocale: browserLanguage,
})

export const apiRequest = client.request
export const apiRequestPage = client.requestPage

export { ApiError, type ApiPage } from '@lifedeck/client'
