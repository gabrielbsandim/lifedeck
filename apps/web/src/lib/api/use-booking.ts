import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AvailabilityOverrideInput,
  BookingClientInput,
  BookingClientView,
  BookingPageView,
  BookingReasonInput,
  BookingServiceInput,
  BookingServiceView,
  BookingSetupView,
  BookingView,
  CreateBookingForClientInput,
  RescheduleBookingInput,
  SetAvailabilityInput,
  SlugAvailabilityView,
  UpsertBookingPageInput,
} from '@lifedeck/application'
import { apiRequest } from '@/lib/api/client'
import { INLINE_ERROR } from '@/lib/api/mutation-feedback'

const BASE = '/api/v1/booking'

export const bookingKey = ['booking'] as const
export const bookingSetupKey = [...bookingKey, 'setup'] as const
export const bookingClientsKey = [...bookingKey, 'clients'] as const
export const bookingListKey = [...bookingKey, 'bookings'] as const

export type BookingListQuery = {
  from: string
  to: string
  status?: readonly BookingView['status'][]
}

export type BookingAction =
  | { kind: 'confirm' }
  | { kind: 'decline'; reason?: string | null }
  | { kind: 'cancel'; reason?: string | null }
  | { kind: 'reschedule'; input: RescheduleBookingInput }
  | { kind: 'outcome'; outcome: 'completed' | 'no_show' }

function json(method: string, body: unknown): RequestInit {
  return { method, body: JSON.stringify(body) }
}

function actionBody(action: BookingAction): unknown {
  switch (action.kind) {
    case 'confirm':
      return {}
    case 'decline':
    case 'cancel':
      return { reason: action.reason ?? null } satisfies BookingReasonInput
    case 'reschedule':
      return action.input
    case 'outcome':
      return { outcome: action.outcome }
  }
}

function useInvalidate(key: readonly unknown[] = bookingKey) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: key })
}

export function useBookingSetup(enabled = true) {
  return useQuery({
    queryKey: bookingSetupKey,
    queryFn: () => apiRequest<BookingSetupView>(`${BASE}/setup`),
    enabled,
  })
}

export function useSlugCheck(slug: string) {
  const value = slug.trim().toLowerCase()
  return useQuery({
    queryKey: [...bookingKey, 'slug', value],
    queryFn: () =>
      apiRequest<SlugAvailabilityView>(
        `${BASE}/slug-check?${new URLSearchParams({ slug: value })}`,
      ),
    enabled: value.length >= 3,
    staleTime: 30_000,
  })
}

export function useSaveBookingPage() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: UpsertBookingPageInput) =>
      apiRequest<BookingPageView>(`${BASE}/page`, json('PUT', input)),
    onSuccess: invalidate,
  })
}

export function useCreateBookingService() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: BookingServiceInput) =>
      apiRequest<BookingServiceView>(`${BASE}/services`, json('POST', input)),
    onSuccess: invalidate,
  })
}

export function useUpdateBookingService() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: ({
      id,
      input,
    }: {
      id: string
      input: Partial<BookingServiceInput>
    }) =>
      apiRequest<BookingServiceView>(
        `${BASE}/services/${id}`,
        json('PATCH', input),
      ),
    onSuccess: invalidate,
  })
}

export function useArchiveBookingService() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<BookingServiceView>(`${BASE}/services/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

export function useReorderBookingServices() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    mutationFn: (ids: string[]) =>
      apiRequest<BookingServiceView[]>(
        `${BASE}/services/reorder`,
        json('POST', { ids }),
      ),
    onSuccess: invalidate,
  })
}

export function useSetAvailability() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: SetAvailabilityInput) =>
      apiRequest<unknown>(`${BASE}/availability`, json('PUT', input)),
    onSuccess: invalidate,
  })
}

export function useSetAvailabilityOverride() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: AvailabilityOverrideInput) =>
      apiRequest<unknown>(`${BASE}/availability/overrides`, json('PUT', input)),
    onSuccess: invalidate,
  })
}

export function useDeleteAvailabilityOverride() {
  const invalidate = useInvalidate(bookingSetupKey)
  return useMutation({
    mutationFn: (date: string) =>
      apiRequest<unknown>(`${BASE}/availability/overrides/${date}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  })
}

export function useBookingClients(search: string, enabled = true) {
  const term = search.trim()
  const query = term ? `?${new URLSearchParams({ search: term })}` : ''
  return useQuery({
    queryKey: [...bookingClientsKey, term],
    queryFn: () => apiRequest<BookingClientView[]>(`${BASE}/clients${query}`),
    enabled,
  })
}

export function useSaveBookingClient() {
  const invalidate = useInvalidate(bookingClientsKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: ({ id, input }: { id?: string; input: BookingClientInput }) =>
      id
        ? apiRequest<BookingClientView>(
            `${BASE}/clients/${id}`,
            json('PATCH', input),
          )
        : apiRequest<BookingClientView>(`${BASE}/clients`, json('POST', input)),
    onSuccess: invalidate,
  })
}

export function bookingListPath(query: BookingListQuery): string {
  const params = new URLSearchParams({ from: query.from, to: query.to })
  if (query.status?.length) {
    params.set('status', query.status.join(','))
  }
  return `${BASE}/bookings?${params}`
}

export function useBookings(query: BookingListQuery, enabled = true) {
  return useQuery({
    queryKey: [...bookingListKey, query],
    queryFn: () => apiRequest<BookingView[]>(bookingListPath(query)),
    enabled,
  })
}

export function useBookingAction() {
  const invalidate = useInvalidate(bookingListKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: ({ id, action }: { id: string; action: BookingAction }) =>
      apiRequest<BookingView>(
        `${BASE}/bookings/${id}/${action.kind}`,
        json('POST', actionBody(action)),
      ),
    onSuccess: invalidate,
  })
}

export function useCreateBookingForClient() {
  const invalidate = useInvalidate(bookingListKey)
  return useMutation({
    meta: INLINE_ERROR,
    mutationFn: (input: CreateBookingForClientInput) =>
      apiRequest<BookingView>(`${BASE}/bookings`, json('POST', input)),
    onSuccess: invalidate,
  })
}
