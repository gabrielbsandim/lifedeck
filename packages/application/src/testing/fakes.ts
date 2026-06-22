import { asEntityId, type EntityId } from '@taskin/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { TokenGenerator } from '@/ports/token-generator'

export class FixedClock implements Clock {
  constructor(private readonly value: Date) {}

  now(): Date {
    return this.value
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private index = 0

  constructor(private readonly ids: EntityId[]) {}

  generate(): EntityId {
    const id = this.ids[this.index]
    if (!id) {
      throw new Error('SequentialIdGenerator ran out of identifiers.')
    }
    this.index += 1
    return id
  }
}

export class FixedTokenGenerator implements TokenGenerator {
  private index = 0

  constructor(private readonly tokens: string[] = ['token-1', 'token-2']) {}

  generate(): string {
    const token = this.tokens[this.index]
    if (!token) {
      throw new Error('FixedTokenGenerator ran out of tokens.')
    }
    this.index += 1
    return token
  }
}

export const ID = {
  task: asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
  list: asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'),
  user: asEntityId('a1c8f2e4-5b6d-4c7e-8f90-1a2b3c4d5e6f'),
  otherUser: asEntityId('b2d9e3f5-6c7e-4d8f-9a01-2b3c4d5e6f70'),
}
