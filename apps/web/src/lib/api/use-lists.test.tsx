import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  listTasksKey,
  useCreateList,
  useCreateListTask,
  useDeleteList,
  useDeleteListTask,
  useLeaveList,
  useList,
  useListTasks,
  useRenameList,
  useReorderListTasks,
  useUpdateListTask,
  useUserLists,
} from '@/lib/api/use-lists'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const LIST_ID = '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'

function task(id: string, position: number, status = 'pending') {
  return {
    id,
    listId: LIST_ID,
    title: id,
    status,
    observation: null,
    assigneeId: null,
    recurringTaskId: null,
    isPrivate: false,
    position,
    createdAt: '2026-06-22T10:00:00.000Z',
    completedAt: null,
  }
}
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

  it('lists the user standalone lists as a first page', async () => {
    const fetchMock = mockFetchOnce({ data: [LIST], nextCursor: null })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUserLists(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.items).toEqual([LIST])
    expect(result.current.hasNextPage).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/lists?type=standalone',
      expect.any(Object),
    )
  })

  it('walks list pages via the cursor', async () => {
    const second = { ...LIST, id: 'second-list' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [LIST], nextCursor: 'cursor-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [second], nextCursor: null }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useUserLists(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)

    await result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/lists?type=standalone&cursor=cursor-1',
      expect.any(Object),
    )
    expect(
      result.current.data?.pages.flatMap(page => page.items).map(l => l.id),
    ).toEqual([LIST_ID, 'second-list'])
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

  it('renames a list via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: LIST })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRenameList(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ title: 'Honeymoon' })
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deletes a list via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useDeleteList(), { wrapper: Wrapper })
    await result.current.mutateAsync(LIST_ID)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('reorders list tasks via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useReorderListTasks(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(['t2', 't1'])
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/tasks`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('optimistically applies a task update to the cached list', async () => {
    mockFetchOnce({ data: { id: 't1' } })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [task('t1', 0)])

    const { result } = renderHook(() => useUpdateListTask(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 't1',
      input: { status: 'completed' },
    })

    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      status: string
    }[]
    expect(cached[0]?.status).toBe('completed')
  })

  it('rolls back an optimistic update when the request fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [task('t1', 0)])

    const { result } = renderHook(() => useUpdateListTask(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current
      .mutateAsync({ id: 't1', input: { status: 'completed' } })
      .catch(() => undefined)

    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      status: string
    }[]
    expect(cached[0]?.status).toBe('pending')
  })

  it('optimistically reorders the cached tasks, keeping unknown ids', async () => {
    mockFetchOnce({ data: [] })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [
      task('a', 0),
      task('b', 1),
    ])

    const { result } = renderHook(() => useReorderListTasks(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(['b'])

    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      id: string
    }[]
    expect(cached.map(t => t.id)).toEqual(['b', 'a'])
  })

  it('rolls back the reorder when the request fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [
      task('a', 0),
      task('b', 1),
    ])

    const { result } = renderHook(() => useReorderListTasks(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(['b', 'a']).catch(() => undefined)

    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      id: string
    }[]
    expect(cached.map(t => t.id)).toEqual(['a', 'b'])
  })

  it('deletes a list task via DELETE and removes it from the cache', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [
      task('a', 0),
      task('b', 1),
    ])

    const { result } = renderHook(() => useDeleteListTask(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('a')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks/a',
      expect.objectContaining({ method: 'DELETE' }),
    )
    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      id: string
    }[]
    expect(cached.map(t => t.id)).toEqual(['b'])
  })

  it('restores the task when a delete fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(listTasksKey(LIST_ID), [
      task('a', 0),
      task('b', 1),
    ])

    const { result } = renderHook(() => useDeleteListTask(LIST_ID), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('a').catch(() => undefined)

    const cached = queryClient.getQueryData(listTasksKey(LIST_ID)) as {
      id: string
    }[]
    expect(cached.map(t => t.id)).toEqual(['a', 'b'])
  })

  it('leaves a list via DELETE membership', async () => {
    const fetchMock = mockFetchOnce({ data: { left: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useLeaveList(), { wrapper: Wrapper })
    await result.current.mutateAsync(LIST_ID)
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/lists/${LIST_ID}/membership`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
