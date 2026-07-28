// Google sign-in on native.
//
// The web flow ends with the callback setting an httpOnly cookie, which the app
// has no way to read. Instead the app opens the same `/auth/google` route with
// `platform=native`, the callback deep-links back to `lifedeck://auth?code=...`
// with a single-use code, and that code is exchanged over HTTPS for the session
// token (see apps/web/src/server/session/native-auth.ts). The token itself never
// travels through the custom-scheme URL, which any app on the device could claim.
//
// The redirect reaches the app by two different roads and which one fires is not
// ours to choose: iOS's auth session captures it and resolves the promise, while
// Android often lets the OS resolve the intent, which relaunches the app on the
// `/auth` route. Both are handled, and `claimCode` makes that safe: the code is
// single-use, so the second road must not try to spend it again.
import { useCallback, useState } from 'react'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import { useExchangeGoogleCode } from '@/lib/api/use-auth'

const AUTH_URL = `${API_BASE_URL}${API_PREFIX}/auth/google?platform=native`
const REDIRECT = 'lifedeck://auth'

// Module state rather than a ref: the two roads land in different components,
// and a code spent by one must be invisible to the other. Small and bounded by
// the number of sign-in attempts in a single app run.
const claimed = new Set<string>()

/** True the first time a code is seen, false every time after. */
export function claimCode(code: string): boolean {
  if (claimed.has(code)) {
    return false
  }
  claimed.add(code)
  return true
}

export function codeFrom(url: string): string | null {
  const { queryParams } = Linking.parse(url)
  const code = queryParams?.code
  return typeof code === 'string' && code ? code : null
}

export type GoogleSignIn = {
  start: () => Promise<void>
  isPending: boolean
  isError: boolean
}

// Opens the OAuth flow in the system auth session. When that session captures
// the redirect itself, the code never surfaces as a deep link, so it is
// exchanged here; when the OS routes it instead, `app/auth.tsx` picks it up.
export function useGoogleSignIn(): GoogleSignIn {
  const exchange = useExchangeGoogleCode()
  const [isPending, setPending] = useState(false)
  const [isError, setError] = useState(false)

  const start = useCallback(async () => {
    setPending(true)
    setError(false)
    try {
      const result = await WebBrowser.openAuthSessionAsync(AUTH_URL, REDIRECT)
      if (result.type !== 'success') {
        // Dismissed or cancelled: the user backed out, which is not an error.
        return
      }
      if (result.url.includes('error=')) {
        setError(true)
        return
      }
      const code = codeFrom(result.url)
      if (code && claimCode(code)) {
        await exchange.mutateAsync(code)
      }
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }, [exchange])

  return { start, isPending, isError }
}
