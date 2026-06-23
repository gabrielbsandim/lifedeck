'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { browserTimeZone } from '@/lib/api/dates'
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

export function useSetCarryOverMode() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (mode: 'manual' | 'auto') =>
      apiRequest<UserView>('/api/v1/account/carry-over', {
        method: 'PATCH',
        body: JSON.stringify({ mode }),
      }),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
    },
  })
}

const DEFAULT_TIMEZONE = 'UTC'

export function useSetTimezone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timezone: string) =>
      apiRequest<UserView>('/api/v1/account/timezone', {
        method: 'PATCH',
        body: JSON.stringify({ timezone }),
      }),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
    },
  })
}

// Auto-detects the device time zone, but only while the account still holds the
// default (UTC) — i.e. it has never been personalized. Once the user has a
// non-default zone (auto-detected once or set by hand), their choice is kept.
export function useSyncTimezone(user: UserView | null | undefined) {
  const queryClient = useQueryClient()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (!user || user.timezone !== DEFAULT_TIMEZONE) {
      return
    }
    const detected = browserTimeZone()
    if (detected === user.timezone || synced.current === detected) {
      return
    }
    synced.current = detected
    void apiRequest<UserView>('/api/v1/account/timezone', {
      method: 'PATCH',
      body: JSON.stringify({ timezone: detected }),
    })
      .then(updated => {
        queryClient.setQueryData(sessionKey, updated)
        void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
      })
      .catch(() => {
        synced.current = null
      })
  }, [user, queryClient])
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
