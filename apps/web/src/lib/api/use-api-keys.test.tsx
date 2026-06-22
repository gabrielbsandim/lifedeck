import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
} from '@/lib/api/use-api-keys'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

describe('api keys hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the api keys', async () => {
    mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useApiKeys(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('creates a key via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { secret: 'tk_live_x' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateApiKey(), { wrapper: Wrapper })
    await result.current.mutateAsync({ name: 'CI', scopes: ['tasks:read'] })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/api-keys',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('revokes a key via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { revoked: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRevokeApiKey(), { wrapper: Wrapper })
    await result.current.mutateAsync('k1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/api-keys/k1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
