import { describe, expect, it } from 'vitest'
import { toEmailLocale } from '@/ports/email-sender'

describe('toEmailLocale', () => {
  it('maps supported locales to their email locale', () => {
    expect(toEmailLocale('pt')).toBe('pt')
    expect(toEmailLocale('es')).toBe('es')
    expect(toEmailLocale('en')).toBe('en')
  })

  it('falls back to English for unknown locales', () => {
    expect(toEmailLocale('fr')).toBe('en')
    expect(toEmailLocale('')).toBe('en')
  })
})
