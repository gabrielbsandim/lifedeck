import { describe, expect, it } from 'vitest'
import { ValidationError } from '@/shared/domain-error'
import { asEntityId } from '@/shared/id'
import { ScheduledJob } from '@/entities/scheduled-job'

const JOB_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function build(): ScheduledJob {
  return ScheduledJob.create({
    id: asEntityId(JOB_ID),
    type: 'daily-digest',
    payload: { userId: 'u1' },
    runAt: new Date('2026-06-24T09:00:00.000Z'),
    createdAt: new Date('2026-06-24T08:00:00.000Z'),
  })
}

describe('ScheduledJob', () => {
  it('creates a pending job with no attempts', () => {
    const job = build()
    const props = job.toJSON()
    expect(props.status).toBe('pending')
    expect(props.attempts).toBe(0)
    expect(props.lastError).toBeNull()
    expect(job.type).toBe('daily-digest')
    expect(job.payload).toEqual({ userId: 'u1' })
  })

  it('rejects an empty type', () => {
    expect(() =>
      ScheduledJob.create({
        id: asEntityId('bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'),
        type: '   ',
        payload: {},
        runAt: new Date(),
        createdAt: new Date(),
      }),
    ).toThrow(ValidationError)
  })

  it('marks a job done', () => {
    const job = build()
    job.markDone()
    expect(job.status).toBe('done')
  })

  it('reschedules with a retry time on a recoverable failure', () => {
    const job = build()
    const retryAt = new Date('2026-06-24T09:05:00.000Z')
    job.markFailed('boom', retryAt)
    const props = job.toJSON()
    expect(props.status).toBe('pending')
    expect(props.attempts).toBe(1)
    expect(props.runAt).toEqual(retryAt)
    expect(props.lastError).toBe('boom')
  })

  it('marks failed permanently when there is no retry time', () => {
    const job = build()
    job.markFailed('boom', null)
    job.markFailed('again', null)
    expect(job.status).toBe('failed')
    expect(job.attempts).toBe(2)
  })

  it('restores from persisted props', () => {
    const job = build()
    const restored = ScheduledJob.restore(job.toJSON())
    expect(restored.toJSON()).toEqual(job.toJSON())
  })
})
