// Mirrors the web use-auth. Register/verify/resend upgrade the *current*
// session in place, so the Bearer token the app already holds stays valid and
// the generic apiRequest is enough. Sign-in issues a NEW session, so it goes
// through sessions.ts, which captures the token into the keychain.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { exchangeNativeAuthCode, signInSession } from '@/lib/api/sessions'
import { sessionKey } from '@/lib/api/use-session'

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<UserView>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
  })
}

export function useVerifyEmail() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { code: string }) =>
      apiRequest<UserView>('/api/v1/auth/verify', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
  })
}

export function useResendCode() {
  return useMutation({
    mutationFn: () =>
      apiRequest<UserView>('/api/v1/auth/resend-code', { method: 'POST' }),
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      signInSession(input),
    onSuccess: (user: UserView) => {
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries()
    },
  })
}

// Completes the Google flow: the browser handed the app a single-use code,
// which is traded for the session token over HTTPS.
export function useExchangeGoogleCode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => exchangeNativeAuthCode(code),
    onSuccess: (user: UserView) => {
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries()
    },
  })
}
