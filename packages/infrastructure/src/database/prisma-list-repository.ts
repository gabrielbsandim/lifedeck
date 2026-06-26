import type { EntityId, List } from '@lifedeck/domain'
import {
  buildPageFrom,
  type ListPageParams,
  type ListRepository,
  type Page,
} from '@lifedeck/application'
import type { Prisma, PrismaClient } from '@prisma/client'
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

  async delete(id: EntityId): Promise<void> {
    await this.prisma.list.delete({ where: { id } })
  }

  async listByOwner(ownerId: EntityId): Promise<List[]> {
    const records = await this.prisma.list.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    })
    return records.map(toDomainList)
  }

  async pageAccessible(
    ownerId: EntityId,
    joinedIds: EntityId[],
    params: ListPageParams,
  ): Promise<Page<List>> {
    const access: Prisma.ListWhereInput =
      joinedIds.length > 0
        ? { OR: [{ ownerId }, { id: { in: joinedIds } }] }
        : { ownerId }
    const where: Prisma.ListWhereInput = {
      AND: [
        access,
        ...(params.type ? [{ type: params.type }] : []),
        ...(params.cursor
          ? [
              {
                OR: [
                  { createdAt: { lt: params.cursor.createdAt } },
                  {
                    createdAt: params.cursor.createdAt,
                    id: { lt: params.cursor.id },
                  },
                ],
              },
            ]
          : []),
      ],
    }
    const records = await this.prisma.list.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: params.limit + 1,
    })
    return buildPageFrom(records.map(toDomainList), params.limit, list => ({
      createdAt: list.toJSON().createdAt,
      id: list.id,
    }))
  }

  async findDailyByOwnerAndDate(
    ownerId: EntityId,
    referenceDate: Date,
  ): Promise<List | null> {
    const record = await this.prisma.list.findFirst({
      where: { ownerId, type: 'daily', referenceDate },
    })
    return record ? toDomainList(record) : null
  }
}
