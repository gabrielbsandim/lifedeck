import { describe, expect, it } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeSetDefaultCalendar } from '@/use-cases/set-default-calendar'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const LATER = new Date('2026-06-24T12:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

function connection(id: string, isDefault: boolean) {
  return CalendarConnection.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    provider: 'google',
    accountEmail: `${id}@example.com`,
    isDefault,
    accessToken: 'a',
    refreshToken: 'r',
    tokenExpiresAt: NOW,
    now: NOW,
  })
}

async function repoWithTwo() {
  const repo = new InMemoryCalendarConnectionRepository()
  await repo.save(connection(A, true))
  await repo.save(connection(B, false))
  return repo
}

describe('setDefaultCalendar', () => {
  it('moves the default to the target and clears the previous one', async () => {
    const repo = await repoWithTwo()
    const setDefault = makeSetDefaultCalendar({
      calendarConnections: repo,
      clock: { now: () => LATER },
    })

    await setDefault(OWNER_ID, B)

    const connections = await repo.listByOwner(asEntityId(OWNER_ID))
    expect(connections.find(c => c.id === A)?.isDefault).toBe(false)
    expect(connections.find(c => c.id === B)?.isDefault).toBe(true)
  })

  it('throws when the target is not owned by the user', async () => {
    const repo = await repoWithTwo()
    const setDefault = makeSetDefaultCalendar({
      calendarConnections: repo,
      clock: { now: () => LATER },
    })
    await expect(
      setDefault(OWNER_ID, 'ffffffff-ffff-4fff-8fff-ffffffffffff'),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
