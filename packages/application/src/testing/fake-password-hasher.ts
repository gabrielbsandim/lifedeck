import type { PasswordHasher } from '@/ports/password-hasher'

export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`
  }
}
