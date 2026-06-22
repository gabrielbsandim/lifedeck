'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserView } from '@taskin/application'
import { apiRequest } from '@/lib/api/client'
import { sessionKey } from '@/lib/api/use-session'

export function useRenameUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { displayName: string }) =>
      apiRequest<UserView>('/api/v1/account', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: user => queryClient.setQueryData(sessionKey, user),
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      apiRequest<UserView>('/api/v1/account/password', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ signedOut: boolean }>('/api/v1/sessions', {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.setQueryData(sessionKey, null)
      queryClient.clear()
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ deleted: boolean }>('/api/v1/account', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData(sessionKey, null)
      queryClient.clear()
    },
  })
}
