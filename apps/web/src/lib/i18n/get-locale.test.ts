import { describe, expect, it } from 'vitest'
import { resolveLocaleFromHeader } from './get-locale'

describe('resolveLocaleFromHeader', () => {
  it('detects a supported locale from the header', () => {
    expect(resolveLocaleFromHeader('pt-BR,pt;q=0.9')).toBe('pt')
  })

  it('falls back to English when the header is missing', () => {
    expect(resolveLocaleFromHeader(null)).toBe('en')
  })
})
