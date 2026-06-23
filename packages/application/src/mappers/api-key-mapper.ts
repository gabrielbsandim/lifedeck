import type { ApiKey } from '@lifedeck/domain'
import type { ApiKeyView } from '@/dtos/api-key-dto'

export function toApiKeyView(apiKey: ApiKey): ApiKeyView {
  const props = apiKey.toJSON()
  return {
    id: props.id as string,
    name: props.name,
    prefix: props.prefix,
    scopes: props.scopes,
    lastUsedAt: props.lastUsedAt ? props.lastUsedAt.toISOString() : null,
    expiresAt: props.expiresAt ? props.expiresAt.toISOString() : null,
    revokedAt: props.revokedAt ? props.revokedAt.toISOString() : null,
    createdAt: props.createdAt.toISOString(),
  }
}
