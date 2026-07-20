import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useLogHabit,
  useUpdateHabit,
} from '@/lib/api/use-habits'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const HABIT = {
  id: 'c3e0f4a6-7d8e-4f90-a1b2-c3d4e5f6a7b8',
  ownerId: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  title: 'Meditate',
  cadence: { kind: 'daily' } as const,
  checkinHour: null,
  active: true,
  createdAt: '2026-07-20T10:00:00.000Z',
  currentStreak: 3,
  doneToday: false,
  scheduledToday: true,
}

describe('habit hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists habits', async () => {
    const fetchMock = mockFetchOnce({ data: [HABIT] })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useHabits(), { wrapper: Wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([HABIT])
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/habits', expect.any(Object))
  })

  it('creates a habit via POST', async () => {
    const fetchMock = mockFetchOnce({ data: HABIT }, true, 201)
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useCreateHabit(), { wrapper: Wrapper })
    await result.current.mutateAsync({
      title: 'Meditate',
      cadence: { kind: 'daily' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/habits',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('updates a habit via PATCH', async () => {
    const fetchMock = mockFetchOnce({ data: HABIT })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useUpdateHabit(), { wrapper: Wrapper })
    await result.current.mutateAsync({
      id: HABIT.id,
      input: { active: false },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/habits/${HABIT.id}`,
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('deletes a habit via DELETE', async () => {
    const fetchMock = mockFetchOnce({ data: { deleted: true } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useDeleteHabit(), { wrapper: Wrapper })
    await result.current.mutateAsync(HABIT.id)

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/habits/${HABIT.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('logs a habit via POST to its logs sub-resource', async () => {
    const fetchMock = mockFetchOnce({ data: { ...HABIT, doneToday: true } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useLogHabit(), { wrapper: Wrapper })
    await result.current.mutateAsync({ id: HABIT.id, input: { done: true } })

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/habits/${HABIT.id}/logs`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
