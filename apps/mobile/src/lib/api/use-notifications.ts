// Ported verbatim from apps/web/src/lib/api/use-notifications.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationListView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const notificationsKey = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: () => apiRequest<NotificationListView>('/api/v1/notifications'),
    refetchInterval: 20_000,
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiRequest<{ read: boolean }>('/api/v1/notifications/read', {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ read: boolean }>(`/api/v1/notifications/${id}/read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}
