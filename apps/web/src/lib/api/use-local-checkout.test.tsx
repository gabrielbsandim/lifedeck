import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useLocalCheckout } from '@/lib/api/use-local-checkout'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

describe('useLocalCheckout', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts a pix checkout and returns the QR payload', async () => {
    const fetchMock = mockFetchOnce({
      data: {
        method: 'pix',
        encodedImage: 'IMG',
        payload: 'CODE',
        expiresAt: null,
      },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useLocalCheckout(), {
      wrapper: Wrapper,
    })

    result.current.mutate({
      method: 'pix',
      plan: 'pro',
      interval: 'monthly',
      cpfCnpj: '11144477735',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      method: 'pix',
      payload: 'CODE',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/billing/local-checkout',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
