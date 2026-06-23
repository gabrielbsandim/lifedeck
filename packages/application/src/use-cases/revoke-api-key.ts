import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ApiKeyRepository } from '@/ports/api-key-repository'
import type { Clock } from '@/ports/clock'

type Dependencies = {
  apiKeys: ApiKeyRepository
  clock: Clock
}

export function makeRevokeApiKey({ apiKeys, clock }: Dependencies) {
  return async function revokeApiKey(
    requesterId: string,
    keyId: string,
  ): Promise<void> {
    const apiKey = await apiKeys.findById(asEntityId(keyId))
    if (!apiKey || apiKey.userId !== asEntityId(requesterId)) {
      throw new NotFoundError('API key')
    }
    apiKey.revoke(clock.now())
    await apiKeys.save(apiKey)
  }
}
