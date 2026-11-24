import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  managedBookingKey,
  useCancelManagedBooking,
  useManagedBooking,
  usePublicSlots,
  useRequestBooking,
  useRescheduleManagedBooking,
} from '@/lib/api/use-public-booking'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const QUERY = {
  serviceId: 's1',
  from: '2026-06-21T00:00:00.000Z',
  to: '2026-06-28T00:00:00.000Z',
}

function bodyOf(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]![1] as RequestInit
  return JSON.parse(init.body as string)
}

describe('public booking hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the slots for a service window', async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => usePublicSlots('ana', QUERY), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0]![0]).toBe(
      `/api/v1/public/booking/ana/slots?${new URLSearchParams(QUERY)}`,
    )
  })

  it('posts a booking request with the honeypot field', async () => {
    const fetchMock = mockFetchOnce({ data: { bookingId: 'b1' } }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRequestBooking('ana'), {
      wrapper: Wrapper,
    })
    const input = {
      serviceId: 's1',
      startsAt: QUERY.from,
      name: 'João',
      email: 'joao@mail.com',
      website: '',
    }
    result.current.mutate(input)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/v1/public/booking/ana/requests',
    )
    expect(bodyOf(fetchMock)).toEqual(input)
  })

  it('reads a booking by its link', async () => {
    const fetchMock = mockFetchOnce({ data: { status: 'confirmed' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useManagedBooking('a.b'), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.data?.status).toBe('confirmed'))
    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/v1/public/booking/manage/a.b',
    )
  })

  it('cancels and stores the new view', async () => {
    const fetchMock = mockFetchOnce({ data: { status: 'cancelled' } })
    const { Wrapper, queryClient } = createWrapper()
    const { result } = renderHook(() => useCancelManagedBooking('tok'), {
      wrapper: Wrapper,
    })
    result.current.mutate({ reason: 'Ill' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/v1/public/booking/manage/tok/cancel',
    )
    expect(queryClient.getQueryData(managedBookingKey('tok'))).toEqual({
      status: 'cancelled',
    })
  })

  it('reschedules to a new start', async () => {
    const fetchMock = mockFetchOnce({ data: { status: 'confirmed' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRescheduleManagedBooking('tok'), {
      wrapper: Wrapper,
    })
    result.current.mutate({ startsAt: QUERY.to })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock.mock.calls[0]![0]).toBe(
      '/api/v1/public/booking/manage/tok/reschedule',
    )
    expect(bodyOf(fetchMock)).toEqual({ startsAt: QUERY.to })
  })
})
