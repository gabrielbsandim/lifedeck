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

  it('lists definitions as a first page', async () => {
    const fetchMock = mockFetchOnce({ data: [DEFINITION], nextCursor: null })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useRecurringTasks(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pages[0]?.items).toEqual([DEFINITION])
    expect(result.current.hasNextPage).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/recurring-tasks',
      expect.any(Object),
    )
  })

  it('walks definition pages via the cursor', async () => {
    const second = { ...DEFINITION, id: 'second-definition' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [DEFINITION], nextCursor: 'cursor-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: [second], nextCursor: null }),
      })
    vi.stubGlobal('fetch', fetchMock)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useRecurringTasks(), {
      wrapper: Wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await waitFor(() => expect(result.current.hasNextPage).toBe(true))
    await result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))

    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/v1/recurring-tasks?cursor=cursor-1',
      expect.any(Object),
    )
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
