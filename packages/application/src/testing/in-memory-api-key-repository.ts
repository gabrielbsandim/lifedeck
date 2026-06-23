import type { ApiKey, EntityId } from '@lifedeck/domain'
import type { ApiKeyRepository } from '@/ports/api-key-repository'

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  private readonly items = new Map<string, ApiKey>()

  async save(apiKey: ApiKey): Promise<void> {
    this.items.set(apiKey.id as string, apiKey)
  }

  async findById(id: EntityId): Promise<ApiKey | null> {
    return this.items.get(id as string) ?? null
  }

  async findBySecretHash(hash: string): Promise<ApiKey | null> {
    for (const item of this.items.values()) {
      if (item.hashedSecret === hash) {
        return item
      }
    }
    return null
  }

  async listByUser(userId: EntityId): Promise<ApiKey[]> {
    return [...this.items.values()]
      .filter(item => item.userId === userId)
      .sort(
        (a, b) =>
          b.toJSON().createdAt.getTime() - a.toJSON().createdAt.getTime(),
      )
  }
}
