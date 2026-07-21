import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useFindTime } from '@/lib/api/use-find-time'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const SLOTS = [
  { startsAt: '2026-07-20T12:00:00.000Z', endsAt: '2026-07-20T13:00:00.000Z' },
  { startsAt: '2026-07-20T15:00:00.000Z', endsAt: '2026-07-20T16:00:00.000Z' },
]

describe('useFindTime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the request and returns the proposed slots', async () => {
    const fetchMock = mockFetchOnce({ data: SLOTS })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useFindTime(), { wrapper: Wrapper })

    result.current.mutate({
      durationMin: 60,
      from: '2026-07-20T00:00:00.000Z',
      to: '2026-07-21T00:00:00.000Z',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(SLOTS)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calendar/find-time',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
