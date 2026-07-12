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

export function useSetReminderPreferences() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: { email?: boolean; whatsapp?: boolean }) =>
      apiRequest<UserView>('/api/v1/account/reminders', {
        method: 'PATCH',
        body: JSON.stringify(prefs),
      }),
    onSuccess: user => {
      queryClient.setQueryData(sessionKey, user)
    },
  })
}

function timezonePinKey(userId: string): string {
  return `lifedeck.tz.pinned.${userId}`
}

function isTimezonePinned(userId: string): boolean {
  try {
    return localStorage.getItem(timezonePinKey(userId)) === '1'
  } catch {
    return false
  }
}

function pinTimezone(userId: string): void {
  try {
    localStorage.setItem(timezonePinKey(userId), '1')
  } catch {
    // localStorage unavailable (private mode / SSR), auto-sync simply repeats.
  }
}

export function useSetTimezone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timezone: string) =>
      apiRequest<UserView>('/api/v1/account/timezone', {
        method: 'PATCH',
        body: JSON.stringify({ timezone }),
      }),
    onSuccess: user => {
      pinTimezone(user.id)
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
    },
  })
}

// Auto-detects the device time zone once per account+browser. After the first
// sync (or any manual change, which pins the choice), the user's selection is
// kept (including an explicit "UTC") so the manual override is never reverted.
export function useSyncTimezone(user: UserView | null | undefined) {
  const queryClient = useQueryClient()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (!user || isTimezonePinned(user.id)) {
      return
    }
    const detected = browserTimeZone()
    if (detected === user.timezone) {
      pinTimezone(user.id)
      return
    }
    if (synced.current === detected) {
      return
    }
    synced.current = detected
    void apiRequest<UserView>('/api/v1/account/timezone', {
      method: 'PATCH',
      body: JSON.stringify({ timezone: detected }),
    })
      .then(updated => {
        pinTimezone(updated.id)
        queryClient.setQueryData(sessionKey, updated)
        void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
      })
      .catch(() => {
        synced.current = null
      })
  }, [user, queryClient])
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (image: Blob) =>
      apiRequest<UserView>('/api/v1/account/avatar', {
        method: 'POST',
        body: image,
        headers: { 'content-type': image.type || 'image/webp' },
      }),
    onSuccess: user => queryClient.setQueryData(sessionKey, user),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<UserView>('/api/v1/account/avatar', { method: 'DELETE' }),
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
