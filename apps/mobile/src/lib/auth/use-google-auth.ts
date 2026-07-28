// Google sign-in on native.
//
// The web flow ends with the callback setting an httpOnly cookie, which the app
// has no way to read. Instead the app opens the same `/auth/google` route with
// `platform=native`, the callback deep-links back to `lifedeck://auth?code=...`
// with a single-use code, and that code is exchanged over HTTPS for the session
// token (see apps/web/src/server/session/native-auth.ts). The token itself never
// travels through the custom-scheme URL, which any app on the device could claim.
import { useCallback, useEffect, useRef, useState } from 'react'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { API_BASE_URL, API_PREFIX } from '@/lib/api/config'
import { useExchangeGoogleCode } from '@/lib/api/use-auth'

const AUTH_URL = `${API_BASE_URL}${API_PREFIX}/auth/google?platform=native`
const REDIRECT = 'lifedeck://auth'

function codeFrom(url: string): string | null {
  const { queryParams } = Linking.parse(url)
  const code = queryParams?.code
  return typeof code === 'string' && code ? code : null
}

// Mounted once at the root. Handles both the cold start (the app was launched
// by the link) and the warm return (it was already running).
export function useGoogleAuthDeepLink(): void {
  const exchange = useExchangeGoogleCode()
  // The exchange is single-use; guard against React 19 double-invoking the
  // effect in development and burning the code on the first mount.
  const claimed = useRef<string | null>(null)

  const handle = useCallback(
    (url: string | null) => {
      if (!url) {
        return
      }
      const code = codeFrom(url)
      if (!code || claimed.current === code) {
        return
      }
      claimed.current = code
      exchange.mutate(code)
    },
    [exchange],
  )

  useEffect(() => {
    void Linking.getInitialURL().then(handle)
    const subscription = Linking.addEventListener('url', event =>
      handle(event.url),
    )
    return () => subscription.remove()
  }, [handle])
}

export type GoogleSignIn = {
  start: () => Promise<void>
  isPending: boolean
  isError: boolean
}

// Opens the OAuth flow in the system auth session. On iOS/Android that browser
// hands control straight back on the redirect; the deep-link listener above
// then completes the exchange.
export function useGoogleSignIn(): GoogleSignIn {
  const [isPending, setPending] = useState(false)
  const [isError, setError] = useState(false)

  const start = useCallback(async () => {
    setPending(true)
    setError(false)
    try {
      const result = await WebBrowser.openAuthSessionAsync(AUTH_URL, REDIRECT)
      if (result.type === 'success' && result.url.includes('error=')) {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setPending(false)
    }
  }, [])

  return { start, isPending, isError }
}
