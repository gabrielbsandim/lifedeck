import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/api/use-notifications'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

describe('notifications hooks', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists notifications with the unread count', async () => {
    mockFetchOnce({ data: { items: [], unread: 0 } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useNotifications(), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ items: [], unread: 0 })
  })

  it('marks all notifications read via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { read: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMarkAllNotificationsRead(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/read',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('marks a single notification read via POST', async () => {
    const fetchMock = mockFetchOnce({ data: { read: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useMarkNotificationRead(), {
      wrapper: Wrapper,
    })
    await result.current.mutateAsync('n1')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/notifications/n1/read',
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
