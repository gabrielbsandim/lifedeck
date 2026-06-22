import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LOCALE,
  isLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from '@/locales'

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

describe('resolveLocale', () => {
  it('resolves an exact tag', () => {
    expect(resolveLocale('pt')).toBe('pt')
    expect(resolveLocale('en')).toBe('en')
  })

  it('resolves regional variants by their explicit tag', () => {
    expect(resolveLocale('en-GB')).toBe('en')
    expect(resolveLocale('pt-BR')).toBe('pt')
  })

  it('resolves an unlisted regional variant by its base', () => {
    expect(resolveLocale('pt-AO')).toBe('pt')
  })

  it('returns null for unsupported and empty tags', () => {
    expect(resolveLocale('fr-FR')).toBeNull()
    expect(resolveLocale('   ')).toBeNull()
  })
})
