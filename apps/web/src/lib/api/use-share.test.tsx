import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateShareLink,
  useRevokeShareLink,
  useShareLinks,
} from '@/lib/api/use-share'
import { useSharedBoard } from '@/lib/api/use-shared-board'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const LIST_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
const LINK = {
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  listId: LIST_ID,
  token: 'secret-token',
  role: 'viewer',
  expiresAt: null,
  createdAt: '2026-06-21T10:00:00.000Z',
}

describe('share hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists share links', async () => {
    mockFetchOnce({ data: [LINK] })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useShareLinks(LIST_ID), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([LINK])
  })

  it('creates a share link via POST', async () => {
    const fetchMock = mockFetchOnce({ data: LINK }, true, 201)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateShareLink(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({})

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/share`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('revokes a share link via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { revoked: true } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useRevokeShareLink(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(LINK.id)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/share/${LINK.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('fetches a shared board by token', async () => {
    const fetchMock = mockFetchOnce({
      data: { list: { id: LIST_ID }, tasks: [], role: 'viewer' },
    })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSharedBoard('secret-token'), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.role).toBe('viewer')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/shared/secret-token',
      expect.any(Object),
    )
  })
})
