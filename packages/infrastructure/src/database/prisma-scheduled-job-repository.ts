import type { ScheduledJob, ScheduledJobStatus } from '@lifedeck/domain'
import type { ScheduledJobRepository } from '@lifedeck/application'
import type { PrismaClient, Prisma } from '@prisma/client'
import {
  toDomainScheduledJob,
  toScheduledJobRecord,
  type ScheduledJobRecord,
} from '@/database/scheduled-job-record'

function fromPrisma(record: {
  id: string
  type: string
  payload: unknown
  runAt: Date
  status: string
  attempts: number
  lastError: string | null
  createdAt: Date
}): ScheduledJobRecord {
  return {
    id: record.id,
    type: record.type,
    payload: (record.payload ?? {}) as Record<string, unknown>,
    runAt: record.runAt,
    status: record.status as ScheduledJobStatus,
    attempts: record.attempts,
    lastError: record.lastError,
    createdAt: record.createdAt,
  }
}

export class PrismaScheduledJobRepository implements ScheduledJobRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(job: ScheduledJob): Promise<void> {
    const record = toScheduledJobRecord(job)
    const payload = record.payload as Prisma.InputJsonValue
    await this.prisma.scheduledJob.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        type: record.type,
        payload,
        runAt: record.runAt,
        status: record.status,
        attempts: record.attempts,
        lastError: record.lastError,
        createdAt: record.createdAt,
      },
      update: {
        runAt: record.runAt,
        status: record.status,
        attempts: record.attempts,
        lastError: record.lastError,
      },
    })
  }

  async listDue(now: Date, limit: number): Promise<ScheduledJob[]> {
    const rows = await this.prisma.scheduledJob.findMany({
      where: { status: 'pending', runAt: { lte: now } },
      orderBy: { runAt: 'asc' },
      take: limit,
    })
    return rows.map(row => toDomainScheduledJob(fromPrisma(row)))
  }
}
