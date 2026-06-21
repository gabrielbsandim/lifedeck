import type { EntityId } from '@taskin/domain'

export interface IdGenerator {
  generate(): EntityId
}
