import { describe, expect, it } from 'vitest'
import { User } from '@taskin/domain'
import { makeSetCarryOverMode } from '@/use-cases/set-carry-over-mode'
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
  return { users, setCarryOverMode: makeSetCarryOverMode({ users }) }
}

describe('setCarryOverMode', () => {
  it('updates the mode and returns the user', async () => {
    const ctx = await setup()
    const view = await ctx.setCarryOverMode(ID.user as string, { mode: 'auto' })
    expect(view.carryOverMode).toBe('auto')
    const stored = await ctx.users.findById(ID.user)
    expect(stored?.carryOverMode).toBe('auto')
  })

  it('rejects an invalid mode', async () => {
    const ctx = await setup()
    await expect(
      ctx.setCarryOverMode(ID.user as string, { mode: 'weekly' }),
    ).rejects.toBeTruthy()
  })

  it('rejects an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.setCarryOverMode(UNKNOWN, { mode: 'auto' }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })
})
