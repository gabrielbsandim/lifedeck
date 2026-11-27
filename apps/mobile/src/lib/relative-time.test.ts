import { afterEach, describe, expect, it, vi } from 'vitest'
import { relativeTime } from '@/lib/relative-time'

const NOW = Date.parse('2026-11-27T12:00:00Z')

describe('relativeTime', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns an empty string for an unparseable date', () => {
    expect(relativeTime('not a date', 'en-US', NOW)).toBe('')
  })

  it.each([
    ['2026-11-27T11:59:30Z', '30 seconds ago'],
    ['2026-11-27T11:55:00Z', '5 minutes ago'],
    ['2026-11-27T09:00:00Z', '3 hours ago'],
    ['2026-11-25T12:00:00Z', '2 days ago'],
  ])('describes %s relative to now', (iso, expected) => {
    expect(relativeTime(iso, 'en-US', NOW)).toBe(expected)
  })

  it('falls back to an absolute date where RelativeTimeFormat is missing', () => {
    vi.stubGlobal('Intl', { DateTimeFormat: Intl.DateTimeFormat })
    const text = relativeTime('2026-11-25T12:00:00Z', 'en-US', NOW)
    expect(text).toContain('Nov')
    expect(text).toContain('25')
  })
})
