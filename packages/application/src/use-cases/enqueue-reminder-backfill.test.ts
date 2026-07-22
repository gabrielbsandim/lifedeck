import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { FixedClock, ID } from '@/testing/fakes'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'
import { makeEnqueueReminderBackfill } from '@/use-cases/enqueue-reminder-backfill'

const NOW = new Date('2026-06-22T10:00:00.000Z')

function connectionFor(
  id: typeof ID.list,
  ownerId: typeof ID.user,
): CalendarConnection {
  return CalendarConnection.create({
    id,
    ownerId,
    provider: 'google',
    accessToken: 'a',
    refreshToken: 'r',
    tokenExpiresAt: new Date('2026-06-22T11:00:00.000Z'),
    now: NOW,
  })
}

describe('enqueueReminderBackfill', () => {
  it('enqueues one forced pull per owner', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    // Two connections for one owner collapse to a single forced pull; the pull
    // fans out over the owner's connections itself.
    await calendarConnections.save(connectionFor(ID.list, ID.user))
    await calendarConnections.save(connectionFor(ID.task, ID.user))
    await calendarConnections.save(connectionFor(ID.subtask, ID.otherUser))
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const backfill = makeEnqueueReminderBackfill({
      calendarConnections,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    })

    const result = await backfill()

    expect(result).toEqual({ enqueued: 2 })
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_PULL_JOB,
      payload: { userId: ID.user as string, force: true },
      runAt: NOW,
    })
  })

  it('enqueues nothing when there are no connections', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const backfill = makeEnqueueReminderBackfill({
      calendarConnections,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    })

    expect(await backfill()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
