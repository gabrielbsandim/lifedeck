import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BookableSlotView,
  BookingReasonInput,
  BookingRequestResult,
  ManagedBookingView,
  RequestBookingInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

const BASE = '/api/v1/public/booking'

export type SlotQuery = { serviceId: string; from: string; to: string }

export const publicSlotsKey = (slug: string, query: SlotQuery) =>
  ['public-booking-slots', slug, query] as const

export const managedBookingKey = (token: string) =>
  ['managed-booking', token] as const

export function usePublicSlots(slug: string, query: SlotQuery) {
  return useQuery({
    queryKey: publicSlotsKey(slug, query),
    queryFn: () =>
      apiRequest<BookableSlotView[]>(
        `${BASE}/${encodeURIComponent(slug)}/slots?${new URLSearchParams(query)}`,
      ),
    retry: false,
  })
}

// The honeypot rides along with the real fields; people never fill it.
export type BookingRequestBody = RequestBookingInput & { website?: string }

export function useRequestBooking(slug: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: BookingRequestBody) =>
      apiRequest<BookingRequestResult>(
        `${BASE}/${encodeURIComponent(slug)}/requests`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['public-booking-slots'] }),
  })
}

export function useManagedBooking(token: string) {
  return useQuery({
    queryKey: managedBookingKey(token),
    queryFn: () =>
      apiRequest<ManagedBookingView>(
        `${BASE}/manage/${encodeURIComponent(token)}`,
      ),
    retry: false,
  })
}

function useManageAction<Input>(token: string, action: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Input) =>
      apiRequest<ManagedBookingView>(
        `${BASE}/manage/${encodeURIComponent(token)}/${action}`,
        { method: 'POST', body: JSON.stringify(input) },
      ),
    onSuccess: view => {
      queryClient.setQueryData(managedBookingKey(token), view)
      queryClient.invalidateQueries({ queryKey: ['public-booking-slots'] })
    },
  })
}

export function useCancelManagedBooking(token: string) {
  return useManageAction<BookingReasonInput>(token, 'cancel')
}

export function useRescheduleManagedBooking(token: string) {
  return useManageAction<{ startsAt: string }>(token, 'reschedule')
}
