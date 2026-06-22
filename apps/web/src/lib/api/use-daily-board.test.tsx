import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateTask,
  useDailyBoard,
  useUpdateTask,
} from '@/lib/api/use-daily-board'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const BOARD = {
  list: {
    id: '1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed',
    ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
    title: '2026-06-21',
    type: 'daily',
    visibility: 'private',
    referenceDate: '2026-06-21',
    createdAt: '2026-06-21T10:00:00.000Z',
    updatedAt: '2026-06-21T10:00:00.000Z',
  },
  tasks: [],
}

describe('useDailyBoard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the board for a date', async () => {
    const fetchMock = mockFetchOnce({ data: BOARD })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useDailyBoard('2026-06-21'), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(BOARD)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/daily?date=2026-06-21',
      expect.any(Object),
    )
  })

  it('creates a task via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 'x' } }, true, 201)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateTask('2026-06-21'), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      listId: BOARD.list.id,
      title: 'Buy flowers',
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a task via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 'x' } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateTask('2026-06-21'), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: 'task-1',
      input: { status: 'completed' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks/task-1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
