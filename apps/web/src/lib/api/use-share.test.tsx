import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateShareLink,
  useMembers,
  useRemoveMember,
  useRevokeShareLink,
  useShareLinks,
} from '@/lib/api/use-share'
import {
  useJoinSharedList,
  useSharedBoard,
  useSharedCreateTask,
  useSharedUpdateTask,
} from '@/lib/api/use-shared-board'
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

  it('lists members', async () => {
    mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMembers(LIST_ID), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([])
  })

  it('removes a member via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { removed: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRemoveMember(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('user-9')
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/members/user-9`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('joins a shared list via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 'm1' } }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useJoinSharedList('secret-token'), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/shared/secret-token/join',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('creates a task from the shared board', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 't1' } }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSharedCreateTask('secret-token'), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ listId: LIST_ID, title: 'Cake' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a task from the shared board', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 't1' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSharedUpdateTask('secret-token'), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 't1',
      input: { status: 'completed' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks/t1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
