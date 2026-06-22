'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserView } from '@taskin/application'
import { apiRequest } from '@/lib/api/client'
import { sessionKey } from '@/lib/api/use-session'

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiRequest<UserView>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: user => queryClient.setQueryData(sessionKey, user),
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
    onSuccess: user => queryClient.setQueryData(sessionKey, user),
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
      apiRequest<UserView>('/api/v1/auth/sign-in', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries()
    },
  })
}
