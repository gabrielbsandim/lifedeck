import { asEntityId } from '@taskin/domain'
import { type ApiKeyView } from '@/dtos/api-key-dto'
import { toApiKeyView } from '@/mappers/api-key-mapper'
import type { ApiKeyRepository } from '@/ports/api-key-repository'

type Dependencies = {
  apiKeys: ApiKeyRepository
}

export function makeListApiKeys({ apiKeys }: Dependencies) {
  return async function listApiKeys(userId: string): Promise<ApiKeyView[]> {
    const keys = await apiKeys.listByUser(asEntityId(userId))
    return keys.map(toApiKeyView)
  }
}
