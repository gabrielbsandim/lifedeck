import { describe, expect, it } from 'vitest'
import { toEmailLocale } from '@/ports/email-sender'

describe('toEmailLocale', () => {
  it('maps supported locales to their email locale', () => {
    expect(toEmailLocale('pt')).toBe('pt')
    expect(toEmailLocale('es')).toBe('es')
    expect(toEmailLocale('en')).toBe('en')
    expect(toEmailLocale('fr')).toBe('fr')
    expect(toEmailLocale('de-DE')).toBe('de')
    expect(toEmailLocale('it')).toBe('it')
  })

  it('falls back to English for unknown locales', () => {
    expect(toEmailLocale('nl')).toBe('en')
    expect(toEmailLocale('')).toBe('en')
  })
})
