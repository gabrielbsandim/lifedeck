import { describe, expect, it } from 'vitest'
import { Argon2PasswordHasher } from '@/security/argon2-password-hasher'
import { ScryptPasswordHasher } from '@/security/scrypt-password-hasher'

describe('Argon2PasswordHasher', () => {
  it('produces an argon2id hash that verifies the password', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('supersecret')
    expect(hash.startsWith('$argon2id$')).toBe(true)
    expect(await hasher.verify('supersecret', hash)).toBe(true)
    expect(await hasher.verify('wrong', hash)).toBe(false)
  })

  it('does not flag its own hashes for rehashing', async () => {
    const hasher = new Argon2PasswordHasher()
    const hash = await hasher.hash('supersecret')
    expect(hasher.needsRehash(hash)).toBe(false)
  })

  it('verifies legacy scrypt hashes via the fallback and flags them for rehash', async () => {
    const scrypt = new ScryptPasswordHasher()
    const legacy = await scrypt.hash('supersecret')
    const hasher = new Argon2PasswordHasher(scrypt)

    expect(await hasher.verify('supersecret', legacy)).toBe(true)
    expect(await hasher.verify('wrong', legacy)).toBe(false)
    expect(hasher.needsRehash(legacy)).toBe(true)
  })

  it('rejects a non-argon2 hash when no legacy hasher is configured', async () => {
    const hasher = new Argon2PasswordHasher()
    expect(await hasher.verify('supersecret', 'salt:deadbeef')).toBe(false)
  })

  it('returns false for a malformed argon2 hash instead of throwing', async () => {
    const hasher = new Argon2PasswordHasher()
    expect(await hasher.verify('supersecret', '$argon2id$broken')).toBe(false)
  })
})
