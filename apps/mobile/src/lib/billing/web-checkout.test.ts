import { describe, expect, it } from 'vitest'
import { webCheckoutAllowed } from '@/lib/billing/web-checkout'

describe('webCheckoutAllowed', () => {
  it('stays off while the build flag is off, even where it would be legal', () => {
    expect(
      webCheckoutAllowed({ os: 'ios', region: 'BR', enabled: false }),
    ).toBe(false)
    expect(
      webCheckoutAllowed({ os: 'web', region: null, enabled: false }),
    ).toBe(false)
  })

  it('allows the link only in the regions the store permits', () => {
    expect(webCheckoutAllowed({ os: 'ios', region: 'BR', enabled: true })).toBe(
      true,
    )
    expect(
      webCheckoutAllowed({ os: 'android', region: 'br', enabled: true }),
    ).toBe(true)
    expect(webCheckoutAllowed({ os: 'ios', region: 'US', enabled: true })).toBe(
      false,
    )
    expect(webCheckoutAllowed({ os: 'ios', region: null, enabled: true })).toBe(
      false,
    )
  })

  it('always allows the browser build and never an unknown platform', () => {
    expect(webCheckoutAllowed({ os: 'web', region: null, enabled: true })).toBe(
      true,
    )
    expect(
      webCheckoutAllowed({ os: 'windows', region: 'BR', enabled: true }),
    ).toBe(false)
  })
})
