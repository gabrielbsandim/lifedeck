import { useMutation } from '@tanstack/react-query'
import type { FindFreeSlotsInput, FreeSlotView } from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { INLINE_ERROR } from '@/lib/api/mutation-feedback'

// Smart scheduling: ask the backend for free slots of a given length. A
// mutation (not a query) because it takes a body and is run on demand from the
// "Find time" action; the caller books a chosen slot via useCreateCalendarEvent.
export function useFindTime() {
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: FindFreeSlotsInput) =>
      apiRequest<FreeSlotView[]>('/api/v1/calendar/find-time', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}
