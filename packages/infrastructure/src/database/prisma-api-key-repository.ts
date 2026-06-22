import type { ApiKey, EntityId } from '@taskin/domain'
import type { ApiKeyRepository } from '@taskin/application'
import type { PrismaClient } from '@prisma/client'
import {
  toApiKeyRecord,
  toDomainApiKey,
  type ApiKeyRecord,
} from '@/database/api-key-record'

function fromPrisma(record: {
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
}): ApiKeyRecord {
  return {
    id: record.id,
    userId: record.userId,
    name: record.name,
    prefix: record.prefix,
    secretHash: record.secretHash,
    scopes: record.scopes,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    revokedAt: record.revokedAt,
    createdAt: record.createdAt,
  }
}

export class PrismaApiKeyRepository implements ApiKeyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(apiKey: ApiKey): Promise<void> {
    const record = toApiKeyRecord(apiKey)
    await this.prisma.apiKey.upsert({
      where: { id: record.id },
      create: record,
      update: {
        name: record.name,
        scopes: record.scopes,
        lastUsedAt: record.lastUsedAt,
        expiresAt: record.expiresAt,
        revokedAt: record.revokedAt,
      },
    })
  }

  async findById(id: EntityId): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findUnique({ where: { id } })
    return record ? toDomainApiKey(fromPrisma(record)) : null
  }

  async findBySecretHash(hash: string): Promise<ApiKey | null> {
    const record = await this.prisma.apiKey.findUnique({
      where: { secretHash: hash },
    })
    return record ? toDomainApiKey(fromPrisma(record)) : null
  }

  async listByUser(userId: EntityId): Promise<ApiKey[]> {
    const records = await this.prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(record => toDomainApiKey(fromPrisma(record)))
  }
}
