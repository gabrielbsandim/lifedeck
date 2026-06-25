import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useStartCheckout } from '@/lib/api/use-checkout'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

describe('useStartCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the checkout request and returns the session url', async () => {
    const fetchMock = mockFetchOnce(
      { data: { url: 'https://pay.example/abc' } },
      true,
      201,
    )
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useStartCheckout(), {
      wrapper: Wrapper,
    })
    const session = await result.current.mutateAsync({
      plan: 'pro',
      interval: 'annual',
      market: 'BR',
    })

    expect(session).toEqual({ url: 'https://pay.example/abc' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/billing/checkout',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
