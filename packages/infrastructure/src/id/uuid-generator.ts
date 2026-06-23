import { randomUUID } from 'node:crypto'
import { asEntityId, type EntityId } from '@lifedeck/domain'
import type { IdGenerator } from '@lifedeck/application'

export class UuidGenerator implements IdGenerator {
  generate(): EntityId {
    return asEntityId(randomUUID())
  }
}
