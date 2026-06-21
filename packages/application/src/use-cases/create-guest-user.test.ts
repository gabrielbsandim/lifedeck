import { describe, expect, it } from 'vitest'
import { makeCreateGuestUser } from '@/use-cases/create-guest-user'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const users = new InMemoryUserRepository()
  const createGuestUser = makeCreateGuestUser({
    users,
    ids: new SequentialIdGenerator([ID.user]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { users, createGuestUser }
}

describe('createGuestUser', () => {
  it('creates a guest user and persists it', async () => {
    const { users, createGuestUser } = setup()

    const view = await createGuestUser({ displayName: 'Gabriel' })

    expect(view).toMatchObject({
      id: ID.user,
      displayName: 'Gabriel',
      isGuest: true,
      locale: 'en',
    })
    expect(await users.findById(ID.user)).not.toBeNull()
  })

  it('honors a provided locale', async () => {
    const { createGuestUser } = setup()
    const view = await createGuestUser({ displayName: 'Noiva', locale: 'pt' })
    expect(view.locale).toBe('pt')
  })

  it('rejects an empty display name', async () => {
    const { createGuestUser } = setup()
    await expect(createGuestUser({ displayName: '' })).rejects.toThrow()
  })
})
