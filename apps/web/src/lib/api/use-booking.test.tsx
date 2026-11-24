import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  bookingListPath,
  bookingSetupKey,
  useArchiveBookingService,
  useBookingAction,
  useBookingClients,
  useBookingSetup,
  useBookings,
  useCreateBookingForClient,
  useCreateBookingService,
  useDeleteAvailabilityOverride,
  useReorderBookingServices,
  useSaveBookingClient,
  useSaveBookingPage,
  useSetAvailability,
  useSetAvailabilityOverride,
  useSlugCheck,
  useUpdateBookingService,
  type BookingAction,
} from '@/lib/api/use-booking'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

type FetchMock = ReturnType<typeof vi.fn>

function call(fetchMock: FetchMock) {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return {
    url,
    method: init.method ?? 'GET',
    body: init.body ? JSON.parse(init.body as string) : undefined,
  }
}

async function runMutation<TInput>(
  hook: () => { mutate: (input: TInput) => void; isSuccess: boolean },
  input: TInput,
) {
  const fetchMock = mockFetchOnce({ data: {} })
  const { Wrapper, queryClient } = createWrapper()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const { result } = renderHook(hook, { wrapper: Wrapper })
  result.current.mutate(input)
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  return { ...call(fetchMock), invalidate }
}

describe('booking host queries', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the setup', async () => {
    const fetchMock = mockFetchOnce({ data: { page: null } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useBookingSetup(), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(call(fetchMock).url).toBe('/api/v1/booking/setup')
  })

  it('checks a slug only once it is long enough', async () => {
    const fetchMock = mockFetchOnce({ data: { available: true } })
    const { Wrapper } = createWrapper()
    const short = renderHook(() => useSlugCheck('ab'), { wrapper: Wrapper })
    expect(short.result.current.fetchStatus).toBe('idle')
    const { result } = renderHook(() => useSlugCheck(' Ana-Host '), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(call(fetchMock).url).toBe('/api/v1/booking/slug-check?slug=ana-host')
  })

  it('searches clients and lists them all without a term', async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useBookingClients(' ana '), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(call(fetchMock).url).toBe('/api/v1/booking/clients?search=ana')

    const all = mockFetchOnce({ data: [] })
    const listed = renderHook(() => useBookingClients(''), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(listed.result.current.isSuccess).toBe(true))
    expect(call(all).url).toBe('/api/v1/booking/clients')
  })

  it('lists bookings in a window with an optional status filter', async () => {
    const query = {
      from: '2026-06-01T00:00:00.000Z',
      to: '2026-07-01T00:00:00.000Z',
    }
    expect(bookingListPath(query)).toBe(
      `/api/v1/booking/bookings?${new URLSearchParams(query)}`,
    )
    expect(
      bookingListPath({ ...query, status: ['pending', 'confirmed'] }),
    ).toContain('status=pending%2Cconfirmed')

    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useBookings(query), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(call(fetchMock).url).toBe(bookingListPath(query))
  })
})

describe('booking host mutations', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('saves the page and refreshes the setup', async () => {
    const sent = await runMutation(() => useSaveBookingPage(), { slug: 'ana' })
    expect(sent).toMatchObject({
      url: '/api/v1/booking/page',
      method: 'PUT',
      body: { slug: 'ana' },
    })
    expect(sent.invalidate).toHaveBeenCalledWith({ queryKey: bookingSetupKey })
  })

  it('creates, edits, archives and reorders services', async () => {
    const input = {
      name: 'Class',
      durationMin: 30,
      location: { kind: 'online-meet' },
    }
    expect(
      await runMutation(() => useCreateBookingService(), input),
    ).toMatchObject({
      url: '/api/v1/booking/services',
      method: 'POST',
      body: input,
    })
    expect(
      await runMutation(() => useUpdateBookingService(), {
        id: 's1',
        input: { name: 'Lesson' },
      }),
    ).toMatchObject({
      url: '/api/v1/booking/services/s1',
      method: 'PATCH',
      body: { name: 'Lesson' },
    })
    expect(
      await runMutation(() => useArchiveBookingService(), 's1'),
    ).toMatchObject({ url: '/api/v1/booking/services/s1', method: 'DELETE' })
    expect(
      await runMutation(() => useReorderBookingServices(), ['s2', 's1']),
    ).toMatchObject({
      url: '/api/v1/booking/services/reorder',
      body: { ids: ['s2', 's1'] },
    })
  })

  it('writes weekly hours and date overrides', async () => {
    const weekly = [{ weekday: 1, startMinute: 540, endMinute: 1020 }]
    expect(
      await runMutation(() => useSetAvailability(), { weekly }),
    ).toMatchObject({
      url: '/api/v1/booking/availability',
      method: 'PUT',
      body: { weekly },
    })
    const override = { date: '2026-06-24', windows: [] }
    expect(
      await runMutation(() => useSetAvailabilityOverride(), override),
    ).toMatchObject({
      url: '/api/v1/booking/availability/overrides',
      body: override,
    })
    expect(
      await runMutation(() => useDeleteAvailabilityOverride(), '2026-06-24'),
    ).toMatchObject({
      url: '/api/v1/booking/availability/overrides/2026-06-24',
      method: 'DELETE',
    })
  })

  it('creates a client or patches an existing one', async () => {
    const input = { name: 'João' }
    expect(
      await runMutation(() => useSaveBookingClient(), { input }),
    ).toMatchObject({ url: '/api/v1/booking/clients', method: 'POST' })
    expect(
      await runMutation(() => useSaveBookingClient(), { id: 'c1', input }),
    ).toMatchObject({ url: '/api/v1/booking/clients/c1', method: 'PATCH' })
  })

  it('sends each booking action with its body', async () => {
    const cases: [BookingAction, unknown][] = [
      [{ kind: 'confirm' }, {}],
      [{ kind: 'decline' }, { reason: null }],
      [{ kind: 'cancel', reason: 'Sick' }, { reason: 'Sick' }],
      [
        {
          kind: 'reschedule',
          input: { startsAt: '2026-06-22T10:00:00.000Z' },
        },
        { startsAt: '2026-06-22T10:00:00.000Z' },
      ],
      [{ kind: 'outcome', outcome: 'no_show' }, { outcome: 'no_show' }],
    ]
    for (const [action, body] of cases) {
      expect(
        await runMutation(() => useBookingAction(), { id: 'b1', action }),
      ).toMatchObject({
        url: `/api/v1/booking/bookings/b1/${action.kind}`,
        method: 'POST',
        body,
      })
    }
  })

  it('books a client on the host side', async () => {
    const input = {
      serviceId: 's1',
      clientId: 'c1',
      startsAt: '2026-06-22T10:00:00.000Z',
    }
    expect(
      await runMutation(() => useCreateBookingForClient(), input),
    ).toMatchObject({ url: '/api/v1/booking/bookings', body: input })
  })
})
