import { describe, expect, it } from 'vitest'
import { Sha256KeyHasher } from '@/security/sha256-key-hasher'

describe('Sha256KeyHasher', () => {
  it('hashes deterministically to a 64-char hex digest', () => {
    const hasher = new Sha256KeyHasher()
    const digest = hasher.hash('tk_live_secret')
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
    expect(hasher.hash('tk_live_secret')).toBe(digest)
  })

  it('produces different digests for different inputs', () => {
    const hasher = new Sha256KeyHasher()
    expect(hasher.hash('a')).not.toBe(hasher.hash('b'))
  })
})
