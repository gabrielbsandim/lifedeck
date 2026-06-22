import type { ApiKey, EntityId } from '@taskin/domain'

export interface ApiKeyRepository {
  save(apiKey: ApiKey): Promise<void>
  findById(id: EntityId): Promise<ApiKey | null>
  findBySecretHash(hash: string): Promise<ApiKey | null>
  listByUser(userId: EntityId): Promise<ApiKey[]>
}
