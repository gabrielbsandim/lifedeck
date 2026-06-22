import { describe, expect, it } from 'vitest'
import { RandomTokenGenerator } from '@/security/random-token-generator'

describe('RandomTokenGenerator', () => {
  it('generates a non-empty url-safe token', () => {
    const token = new RandomTokenGenerator().generate()
    expect(token.length).toBeGreaterThan(0)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates a different token each time', () => {
    const generator = new RandomTokenGenerator()
    expect(generator.generate()).not.toBe(generator.generate())
  })
})
