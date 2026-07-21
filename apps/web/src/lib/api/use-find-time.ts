import { useMutation } from '@tanstack/react-query'
import type { FindFreeSlotsInput, FreeSlotView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

// Smart scheduling: ask the backend for free slots of a given length. A
// mutation (not a query) because it takes a body and is run on demand from the
// "Find time" action; the caller books a chosen slot via useCreateCalendarEvent.
export function useFindTime() {
  return useMutation({
    mutationFn: (input: FindFreeSlotsInput) =>
      apiRequest<FreeSlotView[]>('/api/v1/calendar/find-time', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
