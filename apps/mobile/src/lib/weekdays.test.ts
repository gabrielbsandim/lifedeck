import { describe, expect, it } from 'vitest'
import { weekdayLabels } from '@/lib/weekdays'

describe('weekdayLabels', () => {
  it('returns seven labels starting on Sunday', () => {
    const labels = weekdayLabels('en')
    expect(labels).toHaveLength(7)
    expect(labels[0]).toMatch(/^Sun/)
    expect(labels[6]).toMatch(/^Sat/)
  })

  it('localizes the labels', () => {
    expect(weekdayLabels('pt')[0]).not.toBe(weekdayLabels('en')[0])
  })
})
