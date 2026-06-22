import { createHash } from 'node:crypto'
import type { KeyHasher } from '@taskin/application'

export class Sha256KeyHasher implements KeyHasher {
  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }
}
