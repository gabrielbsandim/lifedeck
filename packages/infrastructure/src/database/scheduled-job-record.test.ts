import { describe, expect, it } from 'vitest'
import { ScheduledJob, asEntityId } from '@lifedeck/domain'
import {
  toDomainScheduledJob,
  toScheduledJobRecord,
  type ScheduledJobRecord,
} from '@/database/scheduled-job-record'

const RECORD: ScheduledJobRecord = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  type: 'daily-digest',
  payload: { userId: 'u1' },
  runAt: new Date('2026-06-24T09:00:00.000Z'),
  status: 'pending',
  attempts: 0,
  lastError: null,
  createdAt: new Date('2026-06-24T08:00:00.000Z'),
}

describe('scheduled-job-record', () => {
  it('maps a record to a domain job', () => {
    const job = toDomainScheduledJob(RECORD)
    expect(job.type).toBe('daily-digest')
    expect(job.payload).toEqual({ userId: 'u1' })
    expect(job.status).toBe('pending')
  })

  it('maps a domain job back to a record', () => {
    const job = ScheduledJob.restore({
      id: asEntityId(RECORD.id),
      type: RECORD.type,
      payload: RECORD.payload,
      runAt: RECORD.runAt,
      status: 'failed',
      attempts: 3,
      lastError: 'boom',
      createdAt: RECORD.createdAt,
    })
    expect(toScheduledJobRecord(job)).toEqual({
      ...RECORD,
      status: 'failed',
      attempts: 3,
      lastError: 'boom',
    })
  })
})
