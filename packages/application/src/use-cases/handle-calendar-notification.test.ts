import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeHandleCalendarNotification } from '@/use-cases/handle-calendar-notification'
import { CALENDAR_PULL_JOB } from '@/use-cases/calendar-sync-jobs'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

async function connectionWithChannel(
  repo: InMemoryCalendarConnectionRepository,
) {
  const connection = CalendarConnection.create({
    id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ownerId: asEntityId(OWNER_ID),
    provider: 'google',
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    tokenExpiresAt: NOW,
    now: NOW,
  })
  connection.setChannel('chan-1', 'res-1', null, NOW)
  await repo.save(connection)
}

describe('handleCalendarNotification', () => {
  it('enqueues a pull job for the channel owner', async () => {
    const calendarConnections = new InMemoryCalendarConnectionRepository()
    await connectionWithChannel(calendarConnections)
    const enqueue = vi.fn().mockResolvedValue(undefined)
    const handle = makeHandleCalendarNotification({
      calendarConnections,
      jobQueue: { enqueue },
      clock: { now: () => NOW },
    })

    expect(await handle('chan-1')).toEqual({ enqueued: true })
    expect(enqueue).toHaveBeenCalledWith({
      type: CALENDAR_PULL_JOB,
      payload: { userId: OWNER_ID },
      runAt: NOW,
    })
  })

  it('ignores notifications for an unknown channel', async () => {
    const enqueue = vi.fn()
    const handle = makeHandleCalendarNotification({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      jobQueue: { enqueue },
      clock: { now: () => NOW },
    })
    expect(await handle('missing')).toEqual({ enqueued: false })
    expect(enqueue).not.toHaveBeenCalled()
  })
})
