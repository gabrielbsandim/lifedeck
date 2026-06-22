import { describe, expect, it } from 'vitest'
import { NumericCodeGenerator } from '@/security/numeric-code-generator'

describe('NumericCodeGenerator', () => {
  it('always returns a zero-padded six-digit code', () => {
    const generator = new NumericCodeGenerator()
    for (let i = 0; i < 200; i += 1) {
      expect(generator.generate()).toMatch(/^\d{6}$/)
    }
  })
})
