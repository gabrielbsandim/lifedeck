import { describe, expect, it } from 'vitest'
import { HmacBookingTokenSigner } from '@/security/hmac-booking-token-signer'

const SECRET = 'a'.repeat(32)
const ID = '0b3f6c2e-1d4a-4c8e-9f2a-7b6d5e4c3b2a'

describe('HmacBookingTokenSigner', () => {
  const signer = new HmacBookingTokenSigner(SECRET)

  it('round-trips a booking id', () => {
    const token = signer.sign(ID)
    expect(token.startsWith(`${ID}.`)).toBe(true)
    expect(signer.verify(token)).toBe(ID)
  })

  it('rejects a forged, truncated or foreign token', () => {
    const token = signer.sign(ID)
    const other = '1b3f6c2e-1d4a-4c8e-9f2a-7b6d5e4c3b2a'
    const [, signature] = token.split('.')
    expect(signer.verify(`${other}.${signature}`)).toBeNull()
    expect(signer.verify(token.slice(0, -4))).toBeNull()
    expect(signer.verify(`${token}.x`)).toBeNull()
    expect(signer.verify('not-a-uuid.abc')).toBeNull()
    expect(signer.verify(ID)).toBeNull()
    expect(new HmacBookingTokenSigner('b'.repeat(32)).verify(token)).toBeNull()
  })

  it('refuses a short secret', () => {
    expect(() => new HmacBookingTokenSigner('short')).toThrow('32 characters')
  })
})
