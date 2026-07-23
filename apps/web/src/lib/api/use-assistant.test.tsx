import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useSendAssistantMessage } from '@/lib/api/use-assistant'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

describe('useSendAssistantMessage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('POSTs the message and returns the reply with actions', async () => {
    const reply = {
      text: 'Added milk.',
      actions: [
        { tool: 'addTask', input: { title: 'milk' }, result: { id: 't1' } },
      ],
    }
    const fetchMock = mockFetchOnce({ data: reply })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSendAssistantMessage(), {
      wrapper: Wrapper,
    })
    const returned = await result.current.mutateAsync({
      text: 'buy milk',
      locale: 'pt',
    })

    expect(returned).toEqual(reply)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/assistant/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ text: 'buy milk', locale: 'pt' }),
      }),
    )
  })

  it('sends media as multipart form data', async () => {
    const fetchMock = mockFetchOnce({ data: { text: 'Got it.', actions: [] } })
    const { Wrapper } = createWrapper()

    const { result } = renderHook(() => useSendAssistantMessage(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({
      image: new Blob([new Uint8Array([1, 2])], { type: 'image/png' }),
      locale: 'en',
    })

    const body = fetchMock.mock.calls[0]?.[1]?.body
    expect(body).toBeInstanceOf(FormData)
    expect((body as FormData).get('image')).toBeInstanceOf(File)
    expect((body as FormData).get('locale')).toBe('en')
  })

  it('refreshes only the screens the taken actions touched', async () => {
    const reply = {
      text: 'Done.',
      actions: [
        { tool: 'addTask', input: { title: 'milk' }, result: { id: 't1' } },
        {
          tool: 'createList',
          input: { title: 'Groceries' },
          result: { id: 'l1' },
        },
        // A second daily-board toucher must not invalidate the same key twice.
        { tool: 'addEvent', input: { title: 'Lunch' }, result: { id: 'e1' } },
        // Read-only tools trigger no refresh.
        { tool: 'getWeather', input: { location: 'Rio' }, result: {} },
      ],
    }
    mockFetchOnce({ data: reply })
    const { Wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSendAssistantMessage(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ text: 'do stuff' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const keys = invalidate.mock.calls.map(([arg]) => arg?.queryKey)
    expect(keys).toEqual([['daily-board'], ['user-lists'], ['calendar-events']])
  })

  it('does not refresh anything when there are no card actions', async () => {
    mockFetchOnce({ data: { text: 'Hi!', actions: [] } })
    const { Wrapper, queryClient } = createWrapper()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useSendAssistantMessage(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync({ text: 'hello' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidate).not.toHaveBeenCalled()
  })
})
