import { describe, expect, it } from 'vitest'
import { ENTITLEMENTS, isEntitlement } from '@/value-objects/entitlement'

describe('entitlement', () => {
  it('accepts every known entitlement', () => {
    for (const entitlement of ENTITLEMENTS) {
      expect(isEntitlement(entitlement)).toBe(true)
    }
  })

  it('rejects an unknown entitlement', () => {
    expect(isEntitlement('teamWorkspace')).toBe(false)
    expect(isEntitlement('')).toBe(false)
  })
})
