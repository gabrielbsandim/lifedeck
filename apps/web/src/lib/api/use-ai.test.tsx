import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { GenerationBrief } from '@taskin/application'
import { useGenerateList, useSaveDraftList } from '@/lib/api/use-ai'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const BRIEF: GenerationBrief = {
  category: 'wedding',
  scale: 'medium',
  description: 'A small garden wedding.',
  locale: 'en',
}

describe('ai hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests a draft via POST', async () => {
    const fetchMock = mockFetchOnce({
      data: { title: 'Wedding', tasks: [] },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useGenerateList(), { wrapper: Wrapper })

    const draft = await result.current.mutateAsync(BRIEF)

    expect(draft.title).toBe('Wedding')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/lists/generate',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('persists a draft as a list, creating tasks and notes', async () => {
    const fetchMock = mockFetchOnce({ data: { id: 'list-1' } }, true, 201)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSaveDraftList(), {
      wrapper: Wrapper,
    })

    const list = await result.current.mutateAsync({
      title: 'Wedding',
      tasks: [
        { title: 'Book the venue', note: 'Visit three' },
        { title: 'Choose the cake', note: null },
      ],
    })

    expect(list.id).toBe('list-1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/lists',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/tasks/list-1',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })
})
