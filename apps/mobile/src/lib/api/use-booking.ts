// The host half of apps/web/src/lib/api/use-booking.ts that the phone needs:
// reading the setup and the bookings, and answering a booking. Editing the page,
// services and hours stays on the web in V5. Keep the shared parts in sync.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  BookingReasonInput,
  BookingSetupView,
  BookingView,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'

const BASE = '/api/v1/booking'

export const bookingKey = ['booking'] as const
export const bookingSetupKey = [...bookingKey, 'setup'] as const
export const bookingListKey = [...bookingKey, 'bookings'] as const

export type BookingListQuery = {
  from: string
  to: string
}

export type BookingAction =
  | { kind: 'confirm' }
  | { kind: 'decline'; reason?: string | null }
  | { kind: 'cancel'; reason?: string | null }
  | { kind: 'outcome'; outcome: 'completed' | 'no_show' }

function actionBody(action: BookingAction): unknown {
  switch (action.kind) {
    case 'confirm':
      return {}
    case 'decline':
    case 'cancel':
      return { reason: action.reason ?? null } satisfies BookingReasonInput
    case 'outcome':
      return { outcome: action.outcome }
  }
}

export function useBookingSetup(enabled = true) {
  return useQuery({
    queryKey: bookingSetupKey,
    queryFn: () => apiRequest<BookingSetupView>(`${BASE}/setup`),
    enabled,
  })
}

export function useBookings(query: BookingListQuery, enabled = true) {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  return useQuery({
    queryKey: [...bookingListKey, query],
    queryFn: () => apiRequest<BookingView[]>(`${BASE}/bookings?${params}`),
    enabled,
  })
}

export function useBookingAction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: BookingAction }) =>
      apiRequest<BookingView>(`${BASE}/bookings/${id}/${action.kind}`, {
        method: 'POST',
        body: JSON.stringify(actionBody(action)),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingListKey })
    },
  })
}
