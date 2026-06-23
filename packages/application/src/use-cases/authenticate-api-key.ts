import type { ApiScope } from '@lifedeck/domain'
import type { ApiKeyRepository } from '@/ports/api-key-repository'
import type { KeyHasher } from '@/ports/key-hasher'
import type { Clock } from '@/ports/clock'

export type ApiKeyPrincipal = {
  keyId: string
  userId: string
  scopes: ApiScope[]
}

type Dependencies = {
  apiKeys: ApiKeyRepository
  hasher: KeyHasher
  clock: Clock
}

export function makeAuthenticateApiKey({
  apiKeys,
  hasher,
  clock,
}: Dependencies) {
  return async function authenticateApiKey(
    rawKey: string,
  ): Promise<ApiKeyPrincipal | null> {
    const apiKey = await apiKeys.findBySecretHash(hasher.hash(rawKey))
    if (!apiKey) {
      return null
    }
    const now = clock.now()
    if (!apiKey.isActive(now)) {
      return null
    }
    apiKey.markUsed(now)
    await apiKeys.save(apiKey)
    return {
      keyId: apiKey.id as string,
      userId: apiKey.userId as string,
      scopes: apiKey.scopes,
    }
  }
}
