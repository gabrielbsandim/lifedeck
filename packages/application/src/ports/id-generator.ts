import type { EntityId } from '@lifedeck/domain'

export interface IdGenerator {
  generate(): EntityId
}
