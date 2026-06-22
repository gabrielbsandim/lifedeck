import type { EntityId, RecurringTask } from '@taskin/domain'
import type { RecurringTaskRepository } from '@taskin/application'
import type { PrismaClient, Prisma } from '@prisma/client'
import {
  toDomainRecurringTask,
  toRecurringTaskRecord,
  type RecurringTaskRecord,
} from '@/database/recurring-task-record'

function toRow(record: RecurringTaskRecord) {
  return {
    id: record.id,
    ownerId: record.ownerId,
    title: record.title,
    rule: record.rule as unknown as Prisma.InputJsonValue,
    createdAt: record.createdAt,
  }
}

function fromRow(row: {
  id: string
  ownerId: string
  title: string
  rule: Prisma.JsonValue
  createdAt: Date
}): RecurringTask {
  return toDomainRecurringTask({
    id: row.id,
    ownerId: row.ownerId,
    title: row.title,
    rule: row.rule as unknown as RecurringTaskRecord['rule'],
    createdAt: row.createdAt,
  })
}

export class PrismaRecurringTaskRepository implements RecurringTaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(task: RecurringTask): Promise<void> {
    const record = toRow(toRecurringTaskRecord(task))
    await this.prisma.recurringTask.upsert({
      where: { id: record.id },
      create: record,
      update: { title: record.title, rule: record.rule },
    })
  }

  async findById(id: EntityId): Promise<RecurringTask | null> {
    const row = await this.prisma.recurringTask.findUnique({ where: { id } })
    return row ? fromRow(row) : null
  }

  async listByOwner(ownerId: EntityId): Promise<RecurringTask[]> {
    const rows = await this.prisma.recurringTask.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(fromRow)
  }
}
