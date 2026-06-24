import { describe, expect, it } from 'vitest'
import { asEntityId } from '@lifedeck/domain'
import { InMemoryScheduledJobRepository } from '@lifedeck/application'
import { OutboxJobQueue } from '@/scheduling/outbox-job-queue'

const NEW_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

describe('OutboxJobQueue', () => {
  it('persists a pending job that becomes due at runAt', async () => {
    const repo = new InMemoryScheduledJobRepository()
    const queue = new OutboxJobQueue(
      repo,
      { generate: () => asEntityId(NEW_ID) },
      { now: () => new Date('2026-06-24T08:00:00.000Z') },
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
    )

    await queue.enqueue({
      type: 'reminder',
      payload: {},
      runAt: new Date('2026-06-24T10:00:00.000Z'),
    })

    const due = await repo.listDue(new Date('2026-06-24T09:00:00.000Z'), 10)
    expect(due).toHaveLength(0)
  })
})
