import { randomBytes } from 'node:crypto'
import type { TokenGenerator } from '@taskin/application'

export class RandomTokenGenerator implements TokenGenerator {
  generate(): string {
    return randomBytes(18).toString('base64url')
  }
}
