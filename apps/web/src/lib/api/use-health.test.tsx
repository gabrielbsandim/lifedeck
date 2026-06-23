import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useHealth } from '@/lib/api/use-health'
import { createWrapper, mockFetchOnce } from '@/lib/api/test-utils'

const REPORT = {
  status: 'ok' as const,
  checkedAt: '2026-06-23T12:00:00.000Z',
  version: 'abc1234',
  components: [{ name: 'database', status: 'up' as const, latencyMs: 4 }],
}

describe('useHealth', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('fetches the health report', async () => {
    const fetchMock = mockFetchOnce({ data: REPORT })
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useHealth(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.status).toBe('ok')
    expect(result.current.data?.components).toHaveLength(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/health', expect.any(Object))
  })

  it('still reads the report body when the service is down', async () => {
    mockFetchOnce({ data: { ...REPORT, status: 'down' } }, false, 503)
    const { Wrapper } = createWrapper()
    const { result } = renderHook(() => useHealth(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.status).toBe('down')
  })
})
