import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  subtasksKey,
  useCreateSubtask,
  useDeleteSubtask,
  useReorderSubtasks,
  useSubtasks,
  useUpdateSubtask,
} from '@/lib/api/use-subtasks'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const TASK_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301'
const BOARD_KEY = ['daily-board', '2026-06-21'] as const

function subtask(id: string, position: number, status = 'pending') {
  return {
    id,
    taskId: TASK_ID,
    title: id,
    status,
    position,
    createdAt: '2026-06-21T10:00:00.000Z',
    completedAt: null,
  }
}

describe('useSubtasks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the subtasks of a task when enabled', async () => {
    const fetchMock = mockFetchOnce({ data: [subtask('a', 0)] })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSubtasks(TASK_ID, true), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/tasks/${TASK_ID}/subtasks`,
      expect.any(Object),
    )
  })

  it('does not fetch while disabled', () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()

    renderHook(() => useSubtasks(TASK_ID, false), { wrapper: Wrapper })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('creates a subtask via POST', async () => {
    const fetchMock = mockFetchOnce({ data: subtask('a', 0) }, true, 201)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateSubtask(TASK_ID, BOARD_KEY), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ title: 'Step' })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/tasks/${TASK_ID}/subtasks`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a subtask via PATCH and optimistically applies it', async () => {
    mockFetchOnce({ data: subtask('a', 0, 'completed') })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [subtask('a', 0)])

    const { result } = renderHook(() => useUpdateSubtask(TASK_ID, BOARD_KEY), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 'a',
      input: { status: 'completed' },
    })

    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      status: string
    }[]
    expect(cached[0]?.status).toBe('completed')
  })

  it('rolls back an update when the request fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [subtask('a', 0)])

    const { result } = renderHook(() => useUpdateSubtask(TASK_ID, BOARD_KEY), {
      wrapper: Wrapper,
    })
    await result.current
      .mutateAsync({ id: 'a', input: { status: 'completed' } })
      .catch(() => undefined)

    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      status: string
    }[]
    expect(cached[0]?.status).toBe('pending')
  })

  it('deletes a subtask via DELETE and removes it from the cache', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [
      subtask('a', 0),
      subtask('b', 1),
    ])

    const { result } = renderHook(() => useDeleteSubtask(TASK_ID, BOARD_KEY), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('a')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/subtasks/a',
      expect.objectContaining({ method: 'DELETE' }),
    )
    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      id: string
    }[]
    expect(cached.map(item => item.id)).toEqual(['b'])
  })

  it('restores the subtask when a delete fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [
      subtask('a', 0),
      subtask('b', 1),
    ])

    const { result } = renderHook(() => useDeleteSubtask(TASK_ID, BOARD_KEY), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('a').catch(() => undefined)

    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      id: string
    }[]
    expect(cached.map(item => item.id)).toEqual(['a', 'b'])
  })

  it('reorders subtasks via PATCH and optimistically reorders the cache', async () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [
      subtask('a', 0),
      subtask('b', 1),
    ])

    const { result } = renderHook(
      () => useReorderSubtasks(TASK_ID, BOARD_KEY),
      { wrapper: Wrapper },
    )
    await result.current.mutateAsync(['b', 'a'])

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/tasks/${TASK_ID}/subtasks`,
      expect.objectContaining({ method: 'PATCH' }),
    )
    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      id: string
    }[]
    expect(cached.map(item => item.id)).toEqual(['b', 'a'])
  })

  it('restores the order when a reorder fails', async () => {
    mockFetchOnce({ error: { message: 'nope' } }, false, 422)
    const { Wrapper, queryClient } = createWrapper()
    queryClient.setQueryData(subtasksKey(TASK_ID), [
      subtask('a', 0),
      subtask('b', 1),
    ])

    const { result } = renderHook(
      () => useReorderSubtasks(TASK_ID, BOARD_KEY),
      { wrapper: Wrapper },
    )
    await result.current.mutateAsync(['b', 'a']).catch(() => undefined)

    const cached = queryClient.getQueryData(subtasksKey(TASK_ID)) as {
      id: string
    }[]
    expect(cached.map(item => item.id)).toEqual(['a', 'b'])
  })
})
