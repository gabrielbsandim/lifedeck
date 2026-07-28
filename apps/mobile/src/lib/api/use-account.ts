// Ported from apps/web/src/lib/api/use-account.ts. Three things differ on
// native and nothing else: the timezone pin lives in SecureStore instead of
// localStorage, the avatar upload sends a file URI through FormData instead of
// a Blob, and signing out drops the keychain token (the web drops a cookie).
import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as SecureStore from 'expo-secure-store'
import type { SetAssistantProfileInput, UserView } from '@lifedeck/application'
import { base64ToBytes } from '@/lib/api/base64'
import { apiRequest } from '@/lib/api/client'
import { deviceTimeZone } from '@/lib/api/dates'
import { clearSessionToken } from '@/lib/api/session-token'
import { unregisterFromPush } from '@/lib/notifications/push-registration'
import { sessionKey } from '@/lib/api/use-session'

export function useRenameUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { displayName: string }) =>
      apiRequest<UserView>('/api/v1/account', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
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
    onSuccess: (user: UserView) => {
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
    onSuccess: (user: UserView) => {
      queryClient.setQueryData(sessionKey, user)
    },
  })
}

export function useSetAssistantProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SetAssistantProfileInput) =>
      apiRequest<UserView>('/api/v1/account/assistant-profile', {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
  })
}

// SecureStore keys are restricted to alphanumerics, `.`, `-` and `_`, which the
// user id (a cuid) and this prefix both satisfy.
function timezonePinKey(userId: string): string {
  return `lifedeck.tz.pinned.${userId}`
}

// The pin is read on mount, so it is cached in memory: an async read cannot
// gate the effect below without flashing an unpinned state first.
const pinned = new Set<string>()

async function loadTimezonePin(userId: string): Promise<boolean> {
  if (pinned.has(userId)) {
    return true
  }
  try {
    const stored = await SecureStore.getItemAsync(timezonePinKey(userId))
    if (stored === '1') {
      pinned.add(userId)
      return true
    }
  } catch {
    // Keychain unavailable — auto-sync simply repeats next launch.
  }
  return false
}

function pinTimezone(userId: string): void {
  pinned.add(userId)
  void SecureStore.setItemAsync(timezonePinKey(userId), '1').catch(() => {
    // Same as above: a failed write only costs one redundant sync.
  })
}

export function useSetTimezone() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (timezone: string) =>
      apiRequest<UserView>('/api/v1/account/timezone', {
        method: 'PATCH',
        body: JSON.stringify({ timezone }),
      }),
    onSuccess: (user: UserView) => {
      pinTimezone(user.id)
      queryClient.setQueryData(sessionKey, user)
      void queryClient.invalidateQueries({ queryKey: ['daily-board'] })
    },
  })
}

// Auto-detects the device time zone once per account+install. After the first
// sync (or any manual change, which pins the choice), the user's selection is
// kept (including an explicit "UTC") so the manual override is never reverted.
export function useSyncTimezone(user: UserView | null | undefined) {
  const queryClient = useQueryClient()
  const synced = useRef<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }
    let cancelled = false
    void loadTimezonePin(user.id).then(isPinned => {
      if (cancelled || isPinned) {
        return
      }
      const detected = deviceTimeZone()
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
    })
    return () => {
      cancelled = true
    }
  }, [user, queryClient])
}

// The avatar route reads the raw request body (not multipart), so the browser
// sends a Blob. The image picker hands the app base64 instead, which decodes to
// the same bytes.
export type AvatarUpload = {
  base64: string
  mimeType: string
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (image: AvatarUpload) =>
      apiRequest<UserView>('/api/v1/account/avatar', {
        method: 'POST',
        body: base64ToBytes(image.base64),
        headers: { 'content-type': image.mimeType || 'image/jpeg' },
      }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
  })
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<UserView>('/api/v1/account/avatar', { method: 'DELETE' }),
    onSuccess: (user: UserView) => queryClient.setQueryData(sessionKey, user),
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
    mutationFn: async () => {
      const result = await apiRequest<{ signedOut: boolean }>(
        '/api/v1/sessions',
        { method: 'DELETE' },
      )
      // Before the token is dropped: unregistering is an authenticated call.
      await unregisterFromPush()
      // The route clears the web's cookie; the app's copy of the token lives in
      // the keychain and has to go too, or the next launch resumes the session.
      await clearSessionToken()
      return result
    },
    onSuccess: () => {
      queryClient.setQueryData(sessionKey, null)
      queryClient.clear()
    },
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const result = await apiRequest<{ deleted: boolean }>('/api/v1/account', {
        method: 'DELETE',
      })
      await clearSessionToken()
      return result
    },
    onSuccess: () => {
      queryClient.setQueryData(sessionKey, null)
      queryClient.clear()
    },
  })
}
