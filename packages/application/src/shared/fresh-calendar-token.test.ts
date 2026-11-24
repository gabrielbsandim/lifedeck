import { describe, expect, it, vi } from 'vitest'
import { CalendarConnection, asEntityId } from '@lifedeck/domain'
import { InMemoryCalendarConnectionRepository } from '@/testing/in-memory-calendar-connection-repository'
import { makeEnsureFreshCalendarToken } from '@/shared/fresh-calendar-token'
import type { CalendarProvider } from '@/ports/calendar-provider'

const NOW = new Date('2026-06-24T10:00:00.000Z')

function connection(refreshToken: string | null, tokenExpiresAt: Date | null) {
  return CalendarConnection.create({
    id: asEntityId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ownerId: asEntityId('bbbbbbbb-bbbb-4bbb-9bbb-bbbbbbbbbbbb'),
    provider: 'google',
    accessToken: 'old',
    refreshToken,
    tokenExpiresAt,
    now: NOW,
  })
}

function provider(): CalendarProvider {
  return {
    provider: 'google',
    exchangeCode: vi.fn(),
    refreshAccessToken: vi.fn().mockResolvedValue({
      accessToken: 'new',
      expiresAt: new Date('2026-06-24T11:00:00.000Z'),
    }),
    listChanges: vi.fn(),
    pushEvent: vi.fn(),
    deleteEvent: vi.fn(),
    watch: vi.fn(),
  }
}

describe('ensureFreshCalendarToken', () => {
  const ensure = () =>
    makeEnsureFreshCalendarToken({
      calendarConnections: new InMemoryCalendarConnectionRepository(),
      clock: { now: () => NOW },
    })

  it('refreshes a token that is about to expire', async () => {
    const target = connection('refresh', new Date('2026-06-24T10:00:30.000Z'))
    await ensure()(target, provider())
    expect(target.accessToken).toBe('new')
  })

  it('leaves a token that is still valid', async () => {
    const google = provider()
    const target = connection('refresh', new Date('2026-06-24T12:00:00.000Z'))
    await ensure()(target, google)
    expect(google.refreshAccessToken).not.toHaveBeenCalled()
  })

  it('skips a connection without a refresh token', async () => {
    const google = provider()
    const target = connection(null, new Date('2026-06-24T09:00:00.000Z'))
    await ensure()(target, google)
    expect(google.refreshAccessToken).not.toHaveBeenCalled()
    expect(target.accessToken).toBe('old')
  })
})
