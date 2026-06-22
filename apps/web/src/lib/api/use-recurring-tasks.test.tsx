import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useUpdateRecurringTask,
} from '@/lib/api/use-recurring-tasks'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const RULE = { freq: 'daily', interval: 1, startDate: '2026-06-21' } as const
const DEFINITION = {
  id: 'c3e0f4a6-7d8e-4f90-a1b2-c3d4e5f6a7b8',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Drink water',
  rule: RULE,
  createdAt: '2026-06-21T10:00:00.000Z',
}

describe('recurring task hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists definitions', async () => {
    mockFetchOnce({ data: [DEFINITION] })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useRecurringTasks(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([DEFINITION])
  })

  it('creates a definition via POST', async () => {
    const fetchMock = mockFetchOnce({ data: DEFINITION }, true, 201)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateRecurringTask(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ title: 'Drink water', rule: RULE })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/recurring-tasks',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a definition via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: DEFINITION })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateRecurringTask(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      id: DEFINITION.id,
      input: { title: 'Stretch' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/recurring-tasks/${DEFINITION.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deletes a definition via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useDeleteRecurringTask(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync(DEFINITION.id)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/recurring-tasks/${DEFINITION.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
