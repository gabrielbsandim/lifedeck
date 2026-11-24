import { describe, expect, it, vi } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import {
  FakeDispatchWatermark,
  InMemoryScheduledJobRepository,
} from '@lifedeck/application'
import { OutboxJobQueue } from '@/scheduling/outbox-job-queue'
import { NoopJobScheduler } from '@/scheduling/noop-job-scheduler'

const NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('OutboxJobQueue', () => {
  it('persists a pending job that becomes due at runAt', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const queue = new OutboxJobQueue(
      repo,
      { generate: () => asEntityId(NEW_ID) },
      { now: () => new Date('2026-06-24T08:00:00.000Z') },
      new NoopJobScheduler(),
      new FakeDispatchWatermark(),
    )
    const runAt = new Date('2026-06-24T09:00:00.000Z')

    await queue.enqueue({
      type: 'daily-digest',
      payload: { userId: 'u1' },
      runAt,
    })

    const due = await repo.listDue(new Date('2026-06-24T09:30:00.000Z'), 10)
    expect(due).toHaveLength(1)
    const [first] = due
    expect(first?.type).toBe('daily-digest')
    expect(first?.payload).toEqual({ userId: 'u1' })
    expect(first?.status).toBe('pending')
  })

  it('does not surface a job before its run time', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const queue = new OutboxJobQueue(
      repo,
      { generate: () => asEntityId(NEW_ID) },
      { now: () => new Date('2026-06-24T08:00:00.000Z') },
      new NoopJobScheduler(),
      new FakeDispatchWatermark(),
    )

    await queue.enqueue({
      type: 'reminder',
      payload: {},
      runAt: new Date('2026-06-24T10:00:00.000Z'),
    })

    const due = await repo.listDue(new Date('2026-06-24T09:00:00.000Z'), 10)
    expect(due).toHaveLength(0)
  })

  it('schedules a wake at the job run time after persisting', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const scheduleWake = vi.fn().mockResolvedValue(undefined)
    const watermark = new FakeDispatchWatermark()
    const queue = new OutboxJobQueue(
      repo,
      { generate: () => asEntityId(NEW_ID) },
      { now: () => new Date('2026-06-24T08:00:00.000Z') },
      { scheduleWake },
      watermark,
    )
    const runAt = new Date('2026-06-24T09:00:00.000Z')

    await queue.enqueue({ type: 'reminder', payload: {}, runAt })

    expect(scheduleWake).toHaveBeenCalledWith(runAt)
    expect(watermark.noted).toEqual([runAt])
    // The job is persisted regardless, so the fallback cron can still drain it.
    const due = await repo.listDue(new Date('2026-06-24T09:30:00.000Z'), 10)
    expect(due).toHaveLength(1)
  })

  it('drops a second job with the same dedup key and skips its wake', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const scheduleWake = vi.fn().mockResolvedValue(undefined)
    let next = 0
    const queue = new OutboxJobQueue(
      repo,
      {
        generate: () =>
          asEntityId(`aaaaaaaa-aaaa-4aaa-8aaa-00000000000${next++}`),
      },
      { now: () => new Date('2026-06-24T08:00:00.000Z') },
      { scheduleWake },
      new FakeDispatchWatermark(),
    )
    const input = {
      type: 'daily-digest',
      payload: { userId: 'u1' },
      runAt: new Date('2026-06-24T09:00:00.000Z'),
      dedupKey: 'digest:u1:2026-06-24',
    }

    await queue.enqueue(input)
    await queue.enqueue(input)
    await queue.enqueue({ ...input, dedupKey: undefined })
    await queue.enqueue({ ...input, dedupKey: undefined })

    const due = await repo.listDue(new Date('2026-06-24T09:30:00.000Z'), 10)
    expect(due).toHaveLength(3)
    expect(scheduleWake).toHaveBeenCalledTimes(3)
  })
})
