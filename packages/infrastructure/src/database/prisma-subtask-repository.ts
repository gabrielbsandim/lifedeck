import type { EntityId, Subtask } from '@lifedeck/domain'
import type { SubtaskCount, SubtaskRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import { toDomainSubtask, toSubtaskRecord } from '@/database/subtask-record'

export class PrismaSubtaskRepository implements SubtaskRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(subtask: Subtask): Promise<void> {
    const record = toSubtaskRecord(subtask)
    await this.prisma.subtask.upsert({
      where: { id: record.id },
      create: record,
      update: {
        title: record.title,
        status: record.status,
        position: record.position,
        completedAt: record.completedAt,
      },
    })
  }

  async findById(id: EntityId): Promise<Subtask | null> {
    const record = await this.prisma.subtask.findUnique({ where: { id } })
    return record ? toDomainSubtask(record) : null
  }

  async listByTask(taskId: EntityId): Promise<Subtask[]> {
    const records = await this.prisma.subtask.findMany({
      where: { taskId },
      orderBy: { position: 'asc' },
    })
    return records.map(toDomainSubtask)
  }

  async countByTasks(taskIds: EntityId[]): Promise<SubtaskCount[]> {
    if (taskIds.length === 0) {
      return []
    }
    const grouped = await this.prisma.subtask.groupBy({
      by: ['taskId', 'status'],
      where: { taskId: { in: taskIds as string[] } },
      _count: { _all: true },
    })

    const counts = new Map<string, SubtaskCount>()
    for (const row of grouped) {
      const current = counts.get(row.taskId) ?? {
        taskId: row.taskId,
        total: 0,
        completed: 0,
      }
      current.total += row._count._all
      if (row.status === 'completed') {
        current.completed += row._count._all
      }
      counts.set(row.taskId, current)
    }
    return [...counts.values()]
  }

  async delete(id: EntityId): Promise<void> {
    await this.prisma.subtask.deleteMany({ where: { id } })
  }
}
