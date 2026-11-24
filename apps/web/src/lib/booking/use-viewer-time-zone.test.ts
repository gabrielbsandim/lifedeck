import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useViewerTimeZone } from '@/lib/booking/use-viewer-time-zone'

describe('useViewerTimeZone', () => {
  it('uses the browser zone, then the preferred one, then a pick', () => {
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(renderHook(() => useViewerTimeZone()).result.current[0]).toBe(
      browser,
    )
    const { result } = renderHook(() => useViewerTimeZone('Europe/Lisbon'))
    expect(result.current[0]).toBe('Europe/Lisbon')
    act(() => result.current[1]('Asia/Tokyo'))
    expect(result.current[0]).toBe('Asia/Tokyo')
  })
})
