import { ValidationError } from '@/shared/domain-error'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type EntityId = string & { readonly __brand: 'EntityId' }

export function asEntityId(value: string): EntityId {
  if (!UUID_PATTERN.test(value)) {
    throw new ValidationError('Identifier must be a valid UUID.')
  }
  return value as EntityId
}
