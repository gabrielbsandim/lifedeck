import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCancelSubscription,
  useSubscription,
} from '@/lib/api/use-subscription'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const SUBSCRIPTION = {
  plan: 'pro',
  status: 'active',
  provider: 'stripe',
  currentPeriodEnd: '2026-07-24T10:00:00.000Z',
  cancelAtPeriodEnd: false,
}

describe('useSubscription', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the current subscription', async () => {
    const fetchMock = mockFetchOnce({ data: { subscription: SUBSCRIPTION } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSubscription(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ subscription: SUBSCRIPTION })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/billing/subscription',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('does not fetch when disabled', () => {
    const fetchMock = mockFetchOnce({ data: { subscription: null } })
    const { Wrapper } = createWrapper()
    renderHook(() => useSubscription(false), { wrapper: Wrapper })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('cancels the subscription', async () => {
    const fetchMock = mockFetchOnce({ data: { cancelAtPeriodEnd: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCancelSubscription(), {
      wrapper: Wrapper,
    })
    result.current.mutate()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/billing/cancel',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
