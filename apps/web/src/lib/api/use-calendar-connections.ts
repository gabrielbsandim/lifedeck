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

type ConnectResult = { connected: boolean; connectionId: string }

// Connect an Apple (iCloud) calendar with an app-specific password.
export function useConnectAppleCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; appPassword: string }) =>
      apiRequest<ConnectResult>('/api/v1/calendar/apple/connect', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarConnectionsKey })
    },
  })
}

// Connect a cal.com account with an API key (read-only import).
export function useConnectCalcomCalendar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { email: string; apiKey: string }) =>
      apiRequest<ConnectResult>('/api/v1/calendar/calcom/connect', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
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
