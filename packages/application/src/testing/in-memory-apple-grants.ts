import type { EntityId } from '@lifedeck/domain'
import type { AppleGrantStore, AppleTokenClient } from '@/ports/apple-grant'

export class InMemoryAppleGrantStore implements AppleGrantStore {
  private readonly tokens = new Map<string, string>()

  async save(userId: EntityId, refreshToken: string): Promise<void> {
    this.tokens.set(userId, refreshToken)
  }

  async find(userId: EntityId): Promise<string | null> {
    return this.tokens.get(userId) ?? null
  }
}

export class FakeAppleTokenClient implements AppleTokenClient {
  readonly revoked: string[] = []
  failWith: Error | null = null

  async exchange(authorizationCode: string): Promise<string> {
    if (this.failWith) {
      throw this.failWith
    }
    return `refresh:${authorizationCode}`
  }

  async revoke(refreshToken: string): Promise<void> {
    if (this.failWith) {
      throw this.failWith
    }
    this.revoked.push(refreshToken)
  }
}
