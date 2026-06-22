import { describe, expect, it } from 'vitest'
import { ScryptPasswordHasher } from '@/security/scrypt-password-hasher'

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher()

  it('produces a salted hash that verifies the original password', async () => {
    const hash = await hasher.hash('supersecret')
    expect(hash).toContain(':')
    expect(await hasher.verify('supersecret', hash)).toBe(true)
  })

  it('uses a fresh salt for each hash', async () => {
    const a = await hasher.hash('supersecret')
    const b = await hasher.hash('supersecret')
    expect(a).not.toBe(b)
  })

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('supersecret')
    expect(await hasher.verify('wrong', hash)).toBe(false)
  })

  it('rejects a malformed hash', async () => {
    expect(await hasher.verify('supersecret', 'not-a-valid-hash')).toBe(false)
  })

  it('rejects a hash whose key length does not match', async () => {
    expect(await hasher.verify('supersecret', 'abcd:00ff')).toBe(false)
  })
})
