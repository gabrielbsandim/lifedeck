import type { EntityId, List } from '@taskin/domain'
import type { ListRepository } from '@taskin/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainList, toListRecord } from '@/database/list-record'

export class PrismaListRepository implements ListRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(list: List): Promise<void> {
    const record = toListRecord(list)
    await this.prisma.list.upsert({
      where: { id: record.id },
      create: record,
      update: {
        title: record.title,
        type: record.type,
        visibility: record.visibility,
        referenceDate: record.referenceDate,
        updatedAt: record.updatedAt,
      },
    })
  }

  async findById(id: EntityId): Promise<List | null> {
    const record = await this.prisma.list.findUnique({ where: { id } })
    return record ? toDomainList(record) : null
  }

  async listByOwner(ownerId: EntityId): Promise<List[]> {
    const records = await this.prisma.list.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(toDomainList)
  }
}
