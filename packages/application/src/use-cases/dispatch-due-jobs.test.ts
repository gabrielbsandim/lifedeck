import { describe, expect, it, vi } from 'vitest'
import { ScheduledJob, asEntityId } from '@lifedeck/domain'
import { FakeDispatchWatermark } from '@/testing/fake-dispatch-watermark'
import { InMemoryScheduledJobRepository } from '@/testing/in-memory-scheduled-job-repository'
import { makeDispatchDueJobs } from '@/use-cases/dispatch-due-jobs'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const clock = { now: () => NOW }

const ID_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const ID_B = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const ID_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

function job(
  id: string,
  type: string,
  runAt: Date,
  payload: Record<string, unknown> = {},
): ScheduledJob {
  return ScheduledJob.create({
    id: asEntityId(id),
    type,
    payload,
    runAt,
    createdAt: new Date('2026-06-24T00:00:00.000Z'),
  })
}

describe('dispatchDueJobs', () => {
  it('runs the handler for a due job and marks it done', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const due = job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z'), {
      userId: 'u1',
    })
    await repo.save(due)
    const handler = vi.fn().mockResolvedValue(undefined)
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: handler },
      clock,
      watermark: new FakeDispatchWatermark(),
    })

    const result = await dispatch()

    expect(handler).toHaveBeenCalledWith({ userId: 'u1' })
    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 })
    expect(due.status).toBe('done')
  })

  it('ignores a job that is not due yet', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T11:00:00.000Z')))
    const handler = vi.fn()
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: handler },
      clock,
      watermark: new FakeDispatchWatermark(),
    })

    const result = await dispatch()

    expect(handler).not.toHaveBeenCalled()
    expect(result.processed).toBe(0)
  })

  it('fails a job permanently when no handler is registered', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const orphan = job(ID_A, 'unknown', new Date('2026-06-24T09:00:00.000Z'))
    await repo.save(orphan)
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: {},
      clock,
      watermark: new FakeDispatchWatermark(),
    })

    const result = await dispatch()

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 })
    expect(orphan.status).toBe('failed')
  })

  it('reschedules with backoff when the handler throws and retries remain', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const flaky = job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z'))
    await repo.save(flaky)
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: {
        ping: async () => {
          throw new Error('boom')
        },
      },
      clock,
      watermark: new FakeDispatchWatermark(),
      backoff: () => 60_000,
    })

    const result = await dispatch()

    expect(result.failed).toBe(1)
    expect(flaky.status).toBe('pending')
    expect(flaky.attempts).toBe(1)
    expect(flaky.toJSON().runAt).toEqual(new Date(NOW.getTime() + 60_000))
  })

  it('fails permanently once the attempt ceiling is reached', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const doomed = job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z'))
    await repo.save(doomed)
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: {
        ping: async () => {
          throw new Error('boom')
        },
      },
      clock,
      watermark: new FakeDispatchWatermark(),
      maxAttempts: 1,
    })

    await dispatch()

    expect(doomed.status).toBe('failed')
    expect(doomed.attempts).toBe(1)
  })

  it('logs a warning while a failed job will still retry', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: {
        ping: async () => {
          throw new Error('google patch 503')
        },
      },
      clock,
      watermark: new FakeDispatchWatermark(),
      logger,
      backoff: () => 60_000,
    })

    await dispatch()

    expect(logger.warn).toHaveBeenCalledWith(
      'job_dispatch_retry',
      expect.objectContaining({ type: 'ping', error: 'google patch 503' }),
    )
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs an error when a job exhausts its retries', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: {
        ping: async () => {
          throw new Error('boom')
        },
      },
      clock,
      watermark: new FakeDispatchWatermark(),
      logger,
      maxAttempts: 1,
    })

    await dispatch()

    expect(logger.error).toHaveBeenCalledWith(
      'job_dispatch_exhausted',
      expect.objectContaining({ type: 'ping', error: 'boom' }),
    )
  })

  it('leases claimed jobs so a second claim in the window skips them', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    const leaseUntil = new Date(NOW.getTime() + 60_000)

    const first = await repo.claimDue(NOW, 10, leaseUntil)
    const second = await repo.claimDue(NOW, 10, leaseUntil)

    expect(first).toHaveLength(1)
    expect(second).toHaveLength(0)
    expect(first[0]?.runAt).toEqual(leaseUntil)
  })

  it('respects the batch limit', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    await repo.save(job(ID_B, 'ping', new Date('2026-06-24T09:01:00.000Z')))
    await repo.save(job(ID_C, 'ping', new Date('2026-06-24T09:02:00.000Z')))
    const handler = vi.fn().mockResolvedValue(undefined)
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: handler },
      clock,
      watermark: new FakeDispatchWatermark(),
    })

    const result = await dispatch(2)

    expect(result.processed).toBe(2)
    expect(handler).toHaveBeenCalledTimes(2)
  })

  it('clears the watermark when the queue drains completely', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    const watermark = new FakeDispatchWatermark()
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: vi.fn().mockResolvedValue(undefined) },
      clock,
      watermark,
    })

    await dispatch()

    expect(watermark.drained).toEqual([null])
    expect(await watermark.hasWorkBefore(NOW)).toBe(false)
  })

  it('leaves the watermark at the next pending job after a partial drain', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const later = new Date('2026-06-24T18:00:00.000Z')
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    await repo.save(job(ID_B, 'ping', later))
    const watermark = new FakeDispatchWatermark()
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: vi.fn().mockResolvedValue(undefined) },
      clock,
      watermark,
    })

    await dispatch()

    expect(watermark.drained).toEqual([later])
    expect(await watermark.hasWorkBefore(NOW)).toBe(false)
    expect(await watermark.hasWorkBefore(later)).toBe(true)
  })

  it('keeps the watermark due when a failed job is scheduled for retry', async () => {
    const repo = new InMemoryScheduledJobRepository()
    await repo.save(job(ID_A, 'ping', new Date('2026-06-24T09:00:00.000Z')))
    const watermark = new FakeDispatchWatermark()
    const dispatch = makeDispatchDueJobs({
      scheduledJobs: repo,
      handlers: { ping: vi.fn().mockRejectedValue(new Error('boom')) },
      clock,
      watermark,
    })

    await dispatch()

    const [retryAt] = watermark.drained
    expect(retryAt).toBeInstanceOf(Date)
    expect(await watermark.hasWorkBefore(retryAt as Date)).toBe(true)
  })
})
