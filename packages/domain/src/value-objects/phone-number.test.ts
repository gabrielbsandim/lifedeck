import { describe, expect, it } from 'vitest'
import { isE164, normalizePhone } from '@/value-objects/phone-number'

describe('phone number', () => {
  it('normalizes digits into E.164 with a leading plus', () => {
    expect(normalizePhone('55 (11) 99999-0000')).toBe('+5511999990000')
    expect(normalizePhone('+5511999990000')).toBe('+5511999990000')
  })

  it('returns an empty string when there are no digits', () => {
    expect(normalizePhone('  ')).toBe('')
  })

  it('validates E.164 shape', () => {
    expect(isE164('+5511999990000')).toBe(true)
    expect(isE164('5511999990000')).toBe(false)
    expect(isE164('+0511999990000')).toBe(false)
    expect(isE164('+12')).toBe(false)
  })
})
