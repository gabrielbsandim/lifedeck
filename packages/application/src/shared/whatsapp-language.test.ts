import { describe, expect, it } from 'vitest'
import { whatsappLanguageForLocale } from '@/shared/whatsapp-language'

describe('whatsappLanguageForLocale', () => {
  it('maps known locales to their WhatsApp language code', () => {
    expect(whatsappLanguageForLocale('pt', 'en')).toBe('pt_BR')
    expect(whatsappLanguageForLocale('en', 'pt_BR')).toBe('en')
    expect(whatsappLanguageForLocale('es', 'pt_BR')).toBe('es')
  })

  it('falls back for an unknown locale', () => {
    expect(whatsappLanguageForLocale('fr', 'pt_BR')).toBe('pt_BR')
  })

  it('falls back when the locale is undefined', () => {
    expect(whatsappLanguageForLocale(undefined, 'en')).toBe('en')
  })
})
