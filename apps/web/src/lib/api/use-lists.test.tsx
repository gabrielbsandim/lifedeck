import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateList,
  useCreateListTask,
  useList,
  useListTasks,
  useUpdateListTask,
  useUserLists,
} from '@/lib/api/use-lists'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const LIST_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'
const LIST = {
  id: LIST_ID,
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Wedding',
  type: 'standalone',
  visibility: 'private',
  referenceDate: null,
  createdAt: '2026-06-22T10:00:00.000Z',
  updatedAt: '2026-06-22T10:00:00.000Z',
}

describe('lists hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the user lists', async () => {
    mockFetchOnce({ data: [LIST] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUserLists(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([LIST])
  })

  it('creates a standalone list via POST', async () => {
    const fetchMock = mockFetchOnce({ data: LIST }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateList(), { wrapper: Wrapper })
    await result.current.mutateAsync({ title: 'Wedding', type: 'standalone' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/lists',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('fetches a single list', async () => {
    const fetchMock = mockFetchOnce({ data: LIST })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useList(LIST_ID), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}`,
      expect.any(Object),
    )
  })

  it('fetches the list tasks', async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useListTasks(LIST_ID), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/tasks`,
      expect.any(Object),
    )
  })

  it('creates a list task via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 't1' } }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCreateListTask(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ listId: LIST_ID, title: 'Cake' })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a list task via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 't1' } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUpdateListTask(LIST_ID), {
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
