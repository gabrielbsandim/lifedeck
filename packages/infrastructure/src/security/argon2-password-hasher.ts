import { hash, verify } from '@node-rs/argon2'
import type { PasswordHasher } from '@lifedeck/application'

const ARGON2_PREFIX = '$argon2'

export class Argon2PasswordHasher implements PasswordHasher {
  constructor(private readonly legacy?: PasswordHasher) {}

  async hash(plain: string): Promise<string> {
    return hash(plain)
  }

  async verify(plain: string, hashed: string): Promise<boolean> {
    if (hashed.startsWith(ARGON2_PREFIX)) {
      try {
        return await verify(hashed, plain)
      } catch {
        return false
      }
    }
    if (this.legacy) {
      return this.legacy.verify(plain, hashed)
    }
    return false
  }

  needsRehash(hashed: string): boolean {
    return !hashed.startsWith(ARGON2_PREFIX)
  }
}
