import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type {
  CalendarEventView,
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  UpdateCalendarOccurrenceInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import type { CalendarRange } from '@/lib/calendar/calendar-view'

export const calendarEventsKey = (range: CalendarRange) =>
  ['calendar-events', range.from, range.to] as const

export function useCalendarEvents(range: CalendarRange, enabled = true) {
  return useQuery({
    queryKey: calendarEventsKey(range),
    queryFn: () =>
      apiRequest<CalendarEventView[]>(
        `/api/v1/calendar/events?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      ),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useCreateCalendarEvent(range: CalendarRange) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateCalendarEventInput) =>
      apiRequest<CalendarEventView>('/api/v1/calendar/events', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarEventsKey(range) })
    },
  })
}

export function useUpdateCalendarEvent(range: CalendarRange) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: UpdateCalendarEventInput
    }) =>
      apiRequest<CalendarEventView>(`/api/v1/calendar/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarEventsKey(range) })
    },
  })
}

export function useDeleteCalendarEvent(range: CalendarRange) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<{ deleted: boolean }>(`/api/v1/calendar/events/${id}`, {
        method: 'DELETE',
      }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarEventsKey(range) })
    },
  })
}

// Edit a single occurrence of a recurring series ("this event only").
export function useUpdateCalendarOccurrence(range: CalendarRange) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      seriesId,
      input,
    }: {
      seriesId: string
      input: UpdateCalendarOccurrenceInput
    }) =>
      apiRequest<CalendarEventView>(
        `/api/v1/calendar/events/${seriesId}/occurrences`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarEventsKey(range) })
    },
  })
}

// Remove a single occurrence of a recurring series ("this event only").
export function useDeleteCalendarOccurrence(range: CalendarRange) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      seriesId,
      occurrenceStart,
    }: {
      seriesId: string
      occurrenceStart: string
    }) =>
      apiRequest<{ deleted: boolean }>(
        `/api/v1/calendar/events/${seriesId}/occurrences?occurrenceStart=${encodeURIComponent(occurrenceStart)}`,
        { method: 'DELETE' },
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: calendarEventsKey(range) })
    },
  })
}
