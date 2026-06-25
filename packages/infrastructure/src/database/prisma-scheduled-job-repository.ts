import type { ScheduledJob, ScheduledJobStatus } from '@lifedeck/domain'
import type { ScheduledJobRepository } from '@lifedeck/application'
import { Prisma } from '@prisma/client'
import type { PrismaClient } from '@prisma/client'
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

  async claimDue(
    now: Date,
    limit: number,
    leaseUntil: Date,
  ): Promise<ScheduledJob[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string
        type: string
        payload: unknown
        run_at: Date
        status: string
        attempts: number
        last_error: string | null
        created_at: Date
      }>
    >(Prisma.sql`
      UPDATE scheduled_jobs
      SET run_at = ${leaseUntil}
      WHERE id IN (
        SELECT id FROM scheduled_jobs
        WHERE status = 'pending' AND run_at <= ${now}
        ORDER BY run_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, payload, run_at, status, attempts, last_error, created_at
    `)
    return rows.map(row =>
      toDomainScheduledJob(
        fromPrisma({
          id: row.id,
          type: row.type,
          payload: row.payload,
          runAt: row.run_at,
          status: row.status,
          attempts: row.attempts,
          lastError: row.last_error,
          createdAt: row.created_at,
        }),
      ),
    )
  }
}
