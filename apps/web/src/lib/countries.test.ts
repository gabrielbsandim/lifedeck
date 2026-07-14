import { describe, expect, it } from 'vitest'
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  findCountry,
  formatNationalNumber,
  toE164,
} from '@/lib/countries'

const BR = DEFAULT_COUNTRY
const US = findCountry('US')!

describe('findCountry', () => {
  it('matches by ISO code, case-insensitive', () => {
    expect(findCountry('br')).toBe(DEFAULT_COUNTRY)
    expect(findCountry('US')?.dial).toBe('1')
  })

  it('returns undefined for empty or unknown', () => {
    expect(findCountry(null)).toBeUndefined()
    expect(findCountry('')).toBeUndefined()
    expect(findCountry('ZZ')).toBeUndefined()
  })

  it('defaults to Brazil', () => {
    expect(DEFAULT_COUNTRY.code).toBe('BR')
    expect(COUNTRIES[0]).toBe(DEFAULT_COUNTRY)
  })
})

describe('formatNationalNumber (BR mask)', () => {
  it('masks a 9-digit mobile', () => {
    expect(formatNationalNumber('11900001111', BR)).toBe('(11) 90000-1111')
  })

  it('masks an 8-digit landline', () => {
    expect(formatNationalNumber('1133334444', BR)).toBe('(11) 3333-4444')
  })

  it('formats partial input progressively', () => {
    expect(formatNationalNumber('1', BR)).toBe('1')
    expect(formatNationalNumber('11', BR)).toBe('11')
    expect(formatNationalNumber('1190', BR)).toBe('(11) 90')
  })

  it('drops non-digits and caps at 11 digits', () => {
    expect(formatNationalNumber('(11) 90000-11119999', BR)).toBe(
      '(11) 90000-1111',
    )
  })
})

describe('formatNationalNumber (generic grouping)', () => {
  it('groups other countries in threes', () => {
    expect(formatNationalNumber('2025550123', US)).toBe('202 555 012 3')
  })
})

describe('toE164', () => {
  it('assembles the dial code and national digits', () => {
    expect(toE164('55', '(11) 90000-1111')).toBe('+5511900001111')
    expect(toE164('1', '202 555 0123')).toBe('+12025550123')
  })
})
