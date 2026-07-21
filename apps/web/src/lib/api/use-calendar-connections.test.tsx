import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  useCalendarConnections,
  useConnectAppleCalendar,
  useConnectCalcomCalendar,
  useDisconnectCalendar,
  useSetDefaultCalendar,
} from '@/lib/api/use-calendar-connections'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const CONNECTION = {
  id: 'a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f',
  provider: 'google',
  accountEmail: 'me@example.com',
  isDefault: true,
  connectedAt: '2026-06-24T08:00:00.000Z',
}

describe('useCalendarConnections', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the connections', async () => {
    const fetchMock = mockFetchOnce({ data: [CONNECTION] })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useCalendarConnections(), {
      wrapper: Wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual([CONNECTION])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calendar/connections',
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('does not fetch when disabled', () => {
    const fetchMock = mockFetchOnce({ data: [] })
    const { Wrapper } = createWrapper()
    renderHook(() => useCalendarConnections(false), { wrapper: Wrapper })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('disconnects a calendar', async () => {
    const fetchMock = mockFetchOnce({ data: { disconnected: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useDisconnectCalendar(), {
      wrapper: Wrapper,
    })
    result.current.mutate(CONNECTION.id)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/connections/${CONNECTION.id}`,
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('connects an Apple calendar with an app password', async () => {
    const fetchMock = mockFetchOnce({
      data: { connected: true, connectionId: 'x' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useConnectAppleCalendar(), {
      wrapper: Wrapper,
    })
    result.current.mutate({ email: 'me@icloud.com', appPassword: 'abcd-efgh' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calendar/apple/connect',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('connects a cal.com account with an API key', async () => {
    const fetchMock = mockFetchOnce({
      data: { connected: true, connectionId: 'y' },
    })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useConnectCalcomCalendar(), {
      wrapper: Wrapper,
    })
    result.current.mutate({ email: 'me@cal.com', apiKey: 'cal_live_key' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/calendar/calcom/connect',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sets a calendar as default', async () => {
    const fetchMock = mockFetchOnce({ data: { isDefault: true } })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useSetDefaultCalendar(), {
      wrapper: Wrapper,
    })
    result.current.mutate(CONNECTION.id)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/calendar/connections/${CONNECTION.id}/default`,
      expect.objectContaining({ method: 'POST' }),
    )
  })
})
