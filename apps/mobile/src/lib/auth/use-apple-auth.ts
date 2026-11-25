// Sign in with Apple, iOS only. App Store review requires it next to Google.
// The native sheet returns an identity token signed by Apple, which the API
// verifies and trades for a session (apps/web/src/app/api/v1/auth/apple).
import { useCallback, useEffect, useState } from 'react'
import { Platform } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useAppleSignInSession } from '@/lib/api/use-auth'

export type AppleSignIn = {
  isAvailable: boolean
  start: () => Promise<boolean>
  isPending: boolean
  isError: boolean
}

function isCancel(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === 'ERR_REQUEST_CANCELED'
  )
}

export function useAppleSignIn(): AppleSignIn {
  const session = useAppleSignInSession()
  const [isAvailable, setAvailable] = useState(false)
  const [isError, setError] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return
    }
    void AppleAuthentication.isAvailableAsync().then(setAvailable)
  }, [])

  // Resolves true once a session exists, so the caller can close its sheet.
  const start = useCallback(async () => {
    setError(false)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) {
        setError(true)
        return false
      }
      const fullName = credential.fullName
        ? AppleAuthentication.formatFullName(credential.fullName).trim()
        : ''
      await session.mutateAsync({
        identityToken: credential.identityToken,
        fullName: fullName || null,
        authorizationCode: credential.authorizationCode,
      })
      return true
    } catch (error) {
      setError(!isCancel(error))
      return false
    }
  }, [session])

  return { isAvailable, start, isPending: session.isPending, isError }
}
