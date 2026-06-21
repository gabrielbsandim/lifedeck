import { randomUUID } from 'node:crypto'
import { asEntityId, type EntityId } from '@taskin/domain'
import type { IdGenerator } from '@taskin/application'

export class UuidGenerator implements IdGenerator {
  generate(): EntityId {
    return asEntityId(randomUUID())
  }
}
