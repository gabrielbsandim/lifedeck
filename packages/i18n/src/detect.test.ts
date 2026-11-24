import { describe, expect, it } from 'vitest'
import { detectLocale } from '@/detect'

describe('detectLocale', () => {
  it('falls back when no header is provided', () => {
    expect(detectLocale(null)).toBe('en')
    expect(detectLocale(undefined)).toBe('en')
  })

  it('picks the highest-quality supported language', () => {
    expect(detectLocale('nl;q=0.9, pt-BR;q=0.8, en;q=0.5')).toBe('pt')
    expect(detectLocale('nl, de-DE;q=0.8, en;q=0.5')).toBe('de')
  })

  it('matches the base of a regional tag', () => {
    expect(detectLocale('pt-BR')).toBe('pt')
  })

  it('falls back when nothing is supported', () => {
    expect(detectLocale('nl-NL,ja;q=0.7', 'en')).toBe('en')
  })

  it('honors a custom fallback', () => {
    expect(detectLocale('', 'pt')).toBe('pt')
  })
})
