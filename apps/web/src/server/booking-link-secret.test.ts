// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { bookingLinkSecret } from '@/server/booking-link-secret'

const AUTH = 'a'.repeat(40)

describe('bookingLinkSecret', () => {
  it('prefers the dedicated secret', () => {
    expect(
      bookingLinkSecret({ BOOKING_LINK_SECRET: ' own ', AUTH_SECRET: AUTH }),
    ).toBe('own')
  })

  it('derives a separate key from AUTH_SECRET', () => {
    const derived = bookingLinkSecret({ AUTH_SECRET: AUTH })
    expect(derived).toMatch(/^[0-9a-f]{64}$/)
    expect(derived).not.toContain(AUTH)
    expect(bookingLinkSecret({ AUTH_SECRET: AUTH })).toBe(derived)
  })

  it('fails without either secret', () => {
    expect(() => bookingLinkSecret({ BOOKING_LINK_SECRET: ' ' })).toThrow(
      'BOOKING_LINK_SECRET or AUTH_SECRET',
    )
  })
})
