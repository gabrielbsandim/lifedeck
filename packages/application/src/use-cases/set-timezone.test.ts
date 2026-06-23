import { describe, expect, it } from 'vitest'
import { User } from '@lifedeck/domain'
import { makeSetTimezone } from '@/use-cases/set-timezone'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-21T10:00:00.000Z')
const UNKNOWN = '00000000-0000-4000-8000-000000000000'

async function setup() {
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      createdAt: NOW,
    }),
  )
  return { users, setTimezone: makeSetTimezone({ users }) }
}

describe('setTimezone', () => {
  it('updates the timezone and returns the user', async () => {
    const ctx = await setup()
    const view = await ctx.setTimezone(ID.user as string, {
      timezone: 'America/Sao_Paulo',
    })
    expect(view.timezone).toBe('America/Sao_Paulo')
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.timezone).toBe('America/Sao_Paulo')
  })

  it('rejects an invalid timezone', async () => {
    const ctx = await setup()
    await expect(
      ctx.setTimezone(ID.user as string, { timezone: 'Mars/Phobos' }),
    ).rejects.toBeTruthy()
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.setTimezone(UNKNOWN, { timezone: 'UTC' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
