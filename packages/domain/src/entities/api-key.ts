import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import { ValidationError } from '@/shared/domain-error'
import {
  API_SCOPES,
  isApiScope,
  type ApiScope,
} from '@/value-objects/api-scope'

export const API_KEY_NAME_MAX_LENGTH = 80

export type ApiKeyProps = {
  id: EntityId
  userId: EntityId
  name: string
  prefix: string
  hashedSecret: string
  scopes: ApiScope[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

function validateScopes(scopes: readonly string[]): ApiScope[] {
  if (scopes.length === 0) {
    throw new ValidationError('An API key must have at least one scope.')
  }
  const unique = Array.from(new Set(scopes))
  for (const scope of unique) {
    if (!isApiScope(scope)) {
      throw new ValidationError(
        `Scope must be one of: ${API_SCOPES.join(', ')}.`,
      )
    }
  }
  return unique as ApiScope[]
}

export class ApiKey {
  private constructor(private props: ApiKeyProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    name: string
    prefix: string
    hashedSecret: string
    scopes: readonly string[]
    expiresAt: Date | null
    createdAt: Date
  }): ApiKey {
    const name = guard.maxLength(
      guard.notEmpty(input.name, 'API key name'),
      API_KEY_NAME_MAX_LENGTH,
      'API key name',
    )
    return new ApiKey({
      id: input.id,
      userId: input.userId,
      name,
      prefix: guard.notEmpty(input.prefix, 'API key prefix'),
      hashedSecret: guard.notEmpty(input.hashedSecret, 'API key secret'),
      scopes: validateScopes(input.scopes),
      lastUsedAt: null,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: input.createdAt,
    })
  }

  static restore(props: ApiKeyProps): ApiKey {
    return new ApiKey({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get prefix(): string {
    return this.props.prefix
  }

  get hashedSecret(): string {
    return this.props.hashedSecret
  }

  get scopes(): ApiScope[] {
    return [...this.props.scopes]
  }

  hasScope(scope: ApiScope): boolean {
    return this.props.scopes.includes(scope)
  }

  isActive(now: Date): boolean {
    if (this.props.revokedAt !== null) {
      return false
    }
    if (this.props.expiresAt !== null && this.props.expiresAt <= now) {
      return false
    }
    return true
  }

  revoke(now: Date): void {
    if (this.props.revokedAt === null) {
      this.props.revokedAt = now
    }
  }

  markUsed(now: Date): void {
    this.props.lastUsedAt = now
  }

  toJSON(): ApiKeyProps {
    return { ...this.props, scopes: [...this.props.scopes] }
  }
}
