import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCreateGuest, useSession } from '@/lib/api/use-session'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const USER = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  displayName: 'Gabriel',
  isGuest: true,
  locale: 'en',
  createdAt: '2026-06-21T10:00:00.000Z',
}

describe('useSession', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the current user', async () => {
    mockFetchOnce({ data: USER })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSession(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(USER)
  })

  it('resolves to null when there is no session', async () => {
    mockFetchOnce(
      { error: { code: 'UNAUTHORIZED', message: 'No session.' } },
      false,
      401,
    )
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSession(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it('surfaces non-auth errors', async () => {
    mockFetchOnce(
      { error: { code: 'INTERNAL_ERROR', message: 'Boom.' } },
      false,
      500,
    )
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSession(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCreateGuest', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('creates a guest and seeds the session cache', async () => {
    const fetchMock = mockFetchOnce({ data: USER }, true, 201)
    const { Wrapper, queryClient } = createWrapper()

    const { result } = renderHook(() => useCreateGuest(), { wrapper: Wrapper })
    await result.current.mutateAsync({ displayName: 'Gabriel' })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/sessions/guest',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(queryClient.getQueryData(['session'])).toEqual(USER)
  })
})
