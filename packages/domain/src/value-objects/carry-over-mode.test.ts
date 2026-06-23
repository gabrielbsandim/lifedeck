import { describe, expect, it } from 'vitest'
import {
  CARRY_OVER_MODES,
  isCarryOverMode,
} from '@/value-objects/carry-over-mode'

describe('carry-over-mode', () => {
  it('accepts every known mode', () => {
    for (const mode of CARRY_OVER_MODES) {
      expect(isCarryOverMode(mode)).toBe(true)
    }
  })

  it('rejects an unknown mode', () => {
    expect(isCarryOverMode('weekly')).toBe(false)
    expect(isCarryOverMode('')).toBe(false)
  })
})
