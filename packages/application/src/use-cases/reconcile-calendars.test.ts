import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { FixedClock, ID } from '@/testing/fakes'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'
import { makeReconcileCalendars } from '@/use-cases/reconcile-calendars'

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

describe('reconcileCalendars', () => {
  it('enqueues a pull job per connection', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await calendarConnections.save(connectionFor(ID.list, ID.user))
    await calendarConnections.save(connectionFor(ID.task, ID.otherUser))
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const reconcileCalendars = makeReconcileCalendars({
      calendarConnections,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    })

    const result = await reconcileCalendars()

    expect(result).toEqual({ enqueued: 2 })
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_PULL_JOB,
      payload: { userId: ID.user as string },
      runAt: NOW,
    })
  })

  it('enqueues nothing when there are no connections', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const reconcileCalendars = makeReconcileCalendars({
      calendarConnections,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
    })

    expect(await reconcileCalendars()).toEqual({ enqueued: 0 })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
