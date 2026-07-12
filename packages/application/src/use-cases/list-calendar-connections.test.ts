import { describe, expect, it } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeListCalendarConnections } from '@/use-cases/list-calendar-connections'

const NOW = new Date('2026-06-24T10:00:00.000Z')
const OWNER_ID = 'bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'

function connection(id: string, email: string, isDefault: boolean) {
  return CalendarConnection.create({
    id: asEntityId(id),
    ownerId: asEntityId(OWNER_ID),
    provider: 'google',
    accountEmail: email,
    isDefault,
    accessToken: 'a',
    refreshToken: 'r',
    tokenExpiresAt: NOW,
    now: NOW,
  })
}

describe('listCalendarConnections', () => {
  it('returns the owner connections as views', async () => {
    const repo = new InMemoryCalendarConnectionRepository()
    await repo.save(
      connection(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'me@example.com',
        true,
      ),
    )
    const list = makeListCalendarConnections({ calendarConnections: repo })

    const views = await list(OWNER_ID)

    expect(views).toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        provider: 'google',
        accountEmail: 'me@example.com',
        isDefault: true,
        connectedAt: NOW.toISOString(),
      },
    ])
  })

  it('returns an empty list when nothing is connected', async () => {
    const list = makeListCalendarConnections({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
    })
    expect(await list(OWNER_ID)).toEqual([])
  })
})
