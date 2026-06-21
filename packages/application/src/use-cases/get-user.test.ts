import { describe, expect, it } from 'vitest'
import { makeGetUser } from '@/use-cases/get-user'
import { makeCreateGuestUser } from '@/use-cases/create-guest-user'
import { NotFoundError } from '@/errors/use-case-error'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

function setup() {
  const users = new InMemoryUserRepository()
  const createGuestUser = makeCreateGuestUser({
    users,
    ids: new SequentialIdGenerator([ID.user]),
    clock: new FixedClock(new Date('2026-06-21T10:00:00.000Z')),
  })
  return { getUser: makeGetUser({ users }), createGuestUser }
}

describe('getUser', () => {
  it('returns the view of an existing user', async () => {
    const { getUser, createGuestUser } = setup()
    await createGuestUser({ displayName: 'Gabriel' })

    const view = await getUser(ID.user)

    expect(view).toMatchObject({ id: ID.user, displayName: 'Gabriel' })
  })

  it('throws NotFoundError when the user is missing', async () => {
    const { getUser } = setup()
    await expect(getUser(ID.user)).rejects.toThrow(NotFoundError)
  })

  it('rejects a malformed identifier', async () => {
    const { getUser } = setup()
    await expect(getUser('not-a-uuid')).rejects.toThrow()
  })
})
