import { ApiKey, asEntityId, isApiScope, type ApiScope } from '@taskin/domain'

export type ApiKeyRecord = {
  id: string
  userId: string
  name: string
  prefix: string
  secretHash: string
  scopes: string[]
  lastUsedAt: Date | null
  expiresAt: Date | null
  revokedAt: Date | null
  createdAt: Date
}

export function toDomainApiKey(record: ApiKeyRecord): ApiKey {
  return ApiKey.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    name: record.name,
    prefix: record.prefix,
    hashedSecret: record.secretHash,
    scopes: record.scopes.filter(isApiScope) as ApiScope[],
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
  })
}

export function toApiKeyRecord(apiKey: ApiKey): ApiKeyRecord {
  const props = apiKey.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    name: props.name,
    prefix: props.prefix,
    secretHash: props.hashedSecret,
    scopes: props.scopes,
    lastUsedAt: props.lastUsedAt,
    expiresAt: props.expiresAt,
    revokedAt: props.revokedAt,
    createdAt: props.createdAt,
  }
}
