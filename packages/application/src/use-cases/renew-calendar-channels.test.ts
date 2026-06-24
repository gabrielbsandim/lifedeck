import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { FixedClock, ID } from '@/testing/fakes'
import { CALENDAR_WATCH_JOB } from '@/use-cases/calendar-sync-jobs'
import { makeRenewCalendarChannels } from '@/use-cases/renew-calendar-channels'

const NOW = new Date('2026-06-22T10:00:00.000Z')
const HOUR = 60 * 60 * 1000

function connection(
  id: typeof ID.list,
  ownerId: typeof ID.user,
  channelExpiresAt: Date | null,
): CalendarConnection {
  const conn = CalendarConnection.create({
    id,
    ownerId,
    provider: 'google',
    accessToken: 'a',
    refreshToken: 'r',
    tokenExpiresAt: new Date('2026-06-22T11:00:00.000Z'),
    now: NOW,
  })
  if (channelExpiresAt) {
    conn.setChannel('chan', 'res', channelExpiresAt, NOW)
  }
  return conn
}

describe('renewCalendarChannels', () => {
  it('enqueues a watch job only for channels near expiry', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await calendarConnections.save(
      connection(ID.list, ID.user, new Date(NOW.getTime() + HOUR)),
    )
    await calendarConnections.save(
      connection(ID.task, ID.otherUser, new Date(NOW.getTime() + 48 * HOUR)),
    )
    await calendarConnections.save(
      connection(ID.verification, asEntityId(`${ID.user}`), null),
    )
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const renewCalendarChannels = makeRenewCalendarChannels({
      calendarConnections,
      jobQueue: { enqueue },
      clock: new FixedClock(NOW),
      renewWithinMs: 24 * HOUR,
    })

    const result = await renewCalendarChannels()

    expect(result).toEqual({ enqueued: 1 })
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_WATCH_JOB,
      payload: { userId: ID.user as string },
      runAt: NOW,
    })
  })
})
