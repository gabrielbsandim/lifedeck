import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, isLocale, SUPPORTED_LOCALES } from './locales'

describe('locales', () => {
  it('exposes a default within the supported set', () => {
    expect(SUPPORTED_LOCALES).toContain(DEFAULT_LOCALE)
  })

  it('recognizes supported and rejects unsupported locales', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('pt')).toBe(true)
    expect(isLocale('fr')).toBe(false)
  })
})
