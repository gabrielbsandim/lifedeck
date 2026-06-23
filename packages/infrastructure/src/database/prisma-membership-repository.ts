import type { EntityId, ListMember } from '@lifedeck/domain'
import type { MembershipRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainMember, toMemberRecord } from '@/database/member-record'

export class PrismaMembershipRepository implements MembershipRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(member: ListMember): Promise<void> {
    const record = toMemberRecord(member)
    await this.prisma.listMember.upsert({
      where: { id: record.id },
      create: record,
      update: { role: record.role },
    })
  }

  async findByListAndUser(
    listId: EntityId,
    userId: EntityId,
  ): Promise<ListMember | null> {
    const record = await this.prisma.listMember.findUnique({
      where: { listId_userId: { listId, userId } },
    })
    return record ? toDomainMember(record) : null
  }

  async listByList(listId: EntityId): Promise<ListMember[]> {
    const records = await this.prisma.listMember.findMany({
      where: { listId },
      orderBy: { addedAt: 'asc' },
    })
    return records.map(toDomainMember)
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.listMember.delete({ where: { id } })
  }
}
