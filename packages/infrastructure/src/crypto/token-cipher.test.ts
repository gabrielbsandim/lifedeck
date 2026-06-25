import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { decryptToken, encryptToken } from '@/crypto/token-cipher'

const ORIGINAL = process.env.CALENDAR_TOKEN_KEY

afterEach(() => {
  if (ORIGINAL === undefined) {
    delete process.env.CALENDAR_TOKEN_KEY
  } else {
    process.env.CALENDAR_TOKEN_KEY = ORIGINAL
  }
})

describe('token-cipher', () => {
  describe('with a configured key', () => {
    beforeEach(() => {
      process.env.CALENDAR_TOKEN_KEY = 'unit-test-secret'
    })

    it('round-trips a token through encryption', () => {
      const cipher = encryptToken('refresh-token-123')
      expect(cipher).toMatch(/^enc:v1:/)
      expect(cipher).not.toContain('refresh-token-123')
      expect(decryptToken(cipher)).toBe('refresh-token-123')
    })

    it('passes through values that are not encrypted', () => {
      expect(decryptToken('plain-value')).toBe('plain-value')
    })

    it('returns malformed ciphertext untouched', () => {
      expect(decryptToken('enc:v1:onlyonepart')).toBe('enc:v1:onlyonepart')
    })
  })

  describe('without a configured key', () => {
    beforeEach(() => {
      delete process.env.CALENDAR_TOKEN_KEY
    })

    it('stores tokens as plaintext outside production', () => {
      expect(encryptToken('token')).toBe('token')
    })

    it('refuses to store plaintext tokens in production', () => {
      const previous = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      try {
        expect(() => encryptToken('token')).toThrow(/CALENDAR_TOKEN_KEY/)
      } finally {
        process.env.NODE_ENV = previous
      }
    })

    it('cannot decrypt an encrypted value and returns it as-is', () => {
      expect(decryptToken('enc:v1:a:b:c')).toBe('enc:v1:a:b:c')
    })
  })
})
