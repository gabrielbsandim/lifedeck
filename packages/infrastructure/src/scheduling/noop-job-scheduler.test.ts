import { describe, expect, it } from 'vitest'
import { NoopJobScheduler } from '@/scheduling/noop-job-scheduler'

describe('NoopJobScheduler', () => {
  it('resolves without scheduling anything', async () => {
    const scheduler = new NoopJobScheduler()
    await expect(
      scheduler.scheduleWake(new Date('2026-06-24T09:00:00.000Z')),
    ).resolves.toBeUndefined()
  })
})
