import type { EntityId, Task } from '@lifedeck/domain'
import type { TaskRepository } from '@lifedeck/application'
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
        listId: record.listId,
        title: record.title,
        status: record.status,
        observation: record.observation,
        assigneeId: record.assigneeId,
        isPrivate: record.isPrivate,
        position: record.position,
        carriedFromDate: record.carriedFromDate,
        carriedForwardAt: record.carriedForwardAt,
        completedAt: record.completedAt,
        recurringTaskId: record.recurringTaskId,
      },
    })
  }

  async claimCarryForward(id: EntityId, at: Date): Promise<boolean> {
    const { count } = await this.prisma.task.updateMany({
      where: { id, carriedForwardAt: null },
      data: { carriedForwardAt: at },
    })
    return count === 1
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

  async delete(id: EntityId): Promise<void> {
    await this.prisma.task.deleteMany({ where: { id } })
  }
}
