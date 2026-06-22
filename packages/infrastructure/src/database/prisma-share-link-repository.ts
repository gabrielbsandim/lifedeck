import type { EntityId, ShareLink } from '@taskin/domain'
import type { ShareLinkRepository } from '@taskin/application'
import type { PrismaClient } from '@prisma/client'
import {
  toDomainShareLink,
  toShareLinkRecord,
} from '@/database/share-link-record'

export class PrismaShareLinkRepository implements ShareLinkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(link: ShareLink): Promise<void> {
    const record = toShareLinkRecord(link)
    await this.prisma.shareLink.upsert({
      where: { id: record.id },
      create: record,
      update: { role: record.role, expiresAt: record.expiresAt },
    })
  }

  async findById(id: EntityId): Promise<ShareLink | null> {
    const record = await this.prisma.shareLink.findUnique({ where: { id } })
    return record ? toDomainShareLink(record) : null
  }

  async findByToken(token: string): Promise<ShareLink | null> {
    const record = await this.prisma.shareLink.findUnique({ where: { token } })
    return record ? toDomainShareLink(record) : null
  }

  async listByList(listId: EntityId): Promise<ShareLink[]> {
    const records = await this.prisma.shareLink.findMany({
      where: { listId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(toDomainShareLink)
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.shareLink.delete({ where: { id } })
  }
}
