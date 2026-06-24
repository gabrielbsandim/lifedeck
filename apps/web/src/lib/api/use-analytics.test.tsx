import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useAnalytics } from '@/lib/api/use-analytics'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const VIEW = {
  from: '2026-06-16',
  to: '2026-06-22',
  totalTasks: 10,
  totalCompleted: 7,
  completionRate: 0.7,
  currentStreak: 3,
  days: [{ date: '2026-06-22', total: 3, completed: 2 }],
}

describe('useAnalytics', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches analytics for the requested window', async () => {
    const fetchMock = mockFetchOnce({ data: VIEW })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useAnalytics(7), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.currentStreak).toBe(3)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/analytics?days=7',
      expect.any(Object),
    )
  })
})
