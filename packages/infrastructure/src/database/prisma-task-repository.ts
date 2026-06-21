import type { EntityId, Task } from '@taskin/domain'
import type { TaskRepository } from '@taskin/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainTask, toTaskRecord } from '@/database/task-record'

export class PrismaTaskRepository implements TaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(task: Task): Promise<void> {
    const record = toTaskRecord(task)
    await this.prisma.task.upsert({
      where: { id: record.id },
      create: record,
      update: {
        title: record.title,
        status: record.status,
        observation: record.observation,
        assigneeId: record.assigneeId,
        completedAt: record.completedAt,
      },
    })
  }

  async findById(id: EntityId): Promise<Task | null> {
    const record = await this.prisma.task.findUnique({ where: { id } })
    return record ? toDomainTask(record) : null
  }

  async listByList(listId: EntityId): Promise<Task[]> {
    const records = await this.prisma.task.findMany({
      where: { listId },
      orderBy: { position: 'asc' },
    })
    return records.map(toDomainTask)
  }
}
