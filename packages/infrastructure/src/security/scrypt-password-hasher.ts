import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { PasswordHasher } from '@taskin/application'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64
const SALT_BYTES = 16

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES).toString('hex')
    const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer
    return `${salt}:${derived.toString('hex')}`
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [salt, key] = hash.split(':')
    if (!salt || !key) {
      return false
    }
    const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer
    const keyBuffer = Buffer.from(key, 'hex')
    if (keyBuffer.length !== derived.length) {
      return false
    }
    return timingSafeEqual(keyBuffer, derived)
  }
}
