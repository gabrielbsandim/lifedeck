import { ApiKey, asEntityId } from '@lifedeck/domain'
import { createApiKeySchema, type CreatedApiKeyView } from '@/dtos/api-key-dto'
import { toApiKeyView } from '@/mappers/api-key-mapper'
import type { ApiKeyRepository } from '@/ports/api-key-repository'
import type { KeyHasher } from '@/ports/key-hasher'
import type { TokenGenerator } from '@/ports/token-generator'
import type { IdGenerator } from '@/ports/id-generator'
import type { Clock } from '@/ports/clock'

const KEY_PREFIX = 'tk_live_'
const DISPLAY_PREFIX_LENGTH = 12
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

type Dependencies = {
  apiKeys: ApiKeyRepository
  hasher: KeyHasher
  tokens: TokenGenerator
  ids: IdGenerator
  clock: Clock
}

export function makeCreateApiKey({
  apiKeys,
  hasher,
  tokens,
  ids,
  clock,
}: Dependencies) {
  return async function createApiKey(
    userId: string,
    input: unknown,
  ): Promise<CreatedApiKeyView> {
    const dto = createApiKeySchema.parse(input)
    const owner = asEntityId(userId)
    const now = clock.now()
    const secret = `${KEY_PREFIX}${tokens.generate()}`
    const expiresAt = dto.expiresInDays
      ? new Date(now.getTime() + dto.expiresInDays * MILLIS_PER_DAY)
      : null
    const apiKey = ApiKey.create({
      id: ids.generate(),
      userId: owner,
      name: dto.name,
      prefix: secret.slice(0, DISPLAY_PREFIX_LENGTH),
      hashedSecret: hasher.hash(secret),
      scopes: dto.scopes,
      expiresAt,
      createdAt: now,
    })
    await apiKeys.save(apiKey)
    return { ...toApiKeyView(apiKey), secret }
  }
}
