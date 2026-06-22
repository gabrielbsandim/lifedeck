import type { KeyHasher } from '@/ports/key-hasher'

export class FakeKeyHasher implements KeyHasher {
  hash(raw: string): string {
    return `hashed:${raw}`
  }
}
