import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CalendarConnectionView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

export const calendarConnectionsKey = ['calendar-connections'] as const

export function useCalendarConnections(enabled = true) {
  return useQuery({
    queryKey: calendarConnectionsKey,
    queryFn: () =>
      apiRequest<CalendarConnectionView[]>('/api/v1/calendar/connections'),
    enabled,
  })
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ disconnected: boolean }>(
        `/api/v1/calendar/connections/${id}`,
        { method: 'DELETE' },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}

export function useSetDefaultCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ isDefault: boolean }>(
        `/api/v1/calendar/connections/${id}/default`,
        { method: 'POST' },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}
