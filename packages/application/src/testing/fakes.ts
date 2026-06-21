import { asEntityId, type EntityId } from '@taskin/domain'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'

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

export const ID = {
  task: asEntityId('3f2504e0-4f89-41d3-9a0c-0305e82c3301'),
  list: asEntityId('1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed'),
}
