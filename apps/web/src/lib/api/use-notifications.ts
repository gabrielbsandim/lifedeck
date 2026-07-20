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
