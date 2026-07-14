import { describe, expect, it } from 'vitest'
import {
  detectMessageLanguage,
  toMessageLanguage,
} from '@/value-objects/message-language'

describe('detectMessageLanguage', () => {
  it('detects Portuguese greetings and phrases', () => {
    expect(detectMessageLanguage('oi')).toBe('pt')
    expect(detectMessageLanguage('Bom dia')).toBe('pt')
    expect(detectMessageLanguage('Obrigado, me lembra amanhã')).toBe('pt')
    expect(detectMessageLanguage('não')).toBe('pt')
  })

  it('detects Spanish greetings and phrases', () => {
    expect(detectMessageLanguage('hola')).toBe('es')
    expect(detectMessageLanguage('Buenos días')).toBe('es')
    expect(detectMessageLanguage('gracias, necesito una tarea')).toBe('es')
    expect(detectMessageLanguage('¿como estas?')).toBe('es')
  })

  it('detects English', () => {
    expect(detectMessageLanguage('hi')).toBe('en')
    expect(detectMessageLanguage('Good morning, remind me tomorrow')).toBe('en')
  })

  it('falls back to English with no signal or on a tie', () => {
    expect(detectMessageLanguage('123456')).toBe('en')
    expect(detectMessageLanguage('')).toBe('en')
    // "esta" scores for both pt and es -> tie -> fallback en
    expect(detectMessageLanguage('esta')).toBe('en')
  })
})

describe('toMessageLanguage', () => {
  it('coerces stored locales', () => {
    expect(toMessageLanguage('pt')).toBe('pt')
    expect(toMessageLanguage('pt-BR')).toBe('pt')
    expect(toMessageLanguage('es')).toBe('es')
    expect(toMessageLanguage('es-MX')).toBe('es')
    expect(toMessageLanguage('en')).toBe('en')
    expect(toMessageLanguage('en-US')).toBe('en')
  })

  it('falls back to English for unknown or empty', () => {
    expect(toMessageLanguage('fr')).toBe('en')
    expect(toMessageLanguage(null)).toBe('en')
    expect(toMessageLanguage(undefined)).toBe('en')
    expect(toMessageLanguage('')).toBe('en')
  })
})
