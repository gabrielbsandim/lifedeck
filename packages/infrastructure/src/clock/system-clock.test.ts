import { describe, expect, it } from 'vitest'
import { SystemClock } from '@/clock/system-clock'

describe('SystemClock', () => {
  it('returns the current date', () => {
    const before = Date.now()
    const now = new SystemClock().now().getTime()
    const after = Date.now()
    expect(now).toBeGreaterThanOrEqual(before)
    expect(now).toBeLessThanOrEqual(after)
  })
})
