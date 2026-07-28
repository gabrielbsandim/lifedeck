// Ported verbatim from apps/web/src/lib/api/use-find-time.ts. Both apps speak the same
// `/api/v1` surface and share the request contract through @lifedeck/client, so
// only the injected transport differs (Bearer token here, cookie on the web).
// Keep the two in sync when either changes.
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
