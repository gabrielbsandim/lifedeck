import { describe, expect, it } from 'vitest'
import { User } from '@lifedeck/domain'
import { makeChangePassword } from '@/use-cases/change-password'
import { makeRenameUser } from '@/use-cases/rename-user'
import { makeDeleteUser } from '@/use-cases/delete-user'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FakePasswordHasher } from '@/testing/fake-password-hasher'
import { ID } from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')
const UNKNOWN = '00000000-0000-4000-8000-000000000000'

async function setup(withPassword = true) {
  const users = new InMemoryUserRepository()
  const hasher = new FakePasswordHasher()
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: NOW,
  })
  user.register({
    email: 'gab@example.com',
    passwordHash: withPassword ? await hasher.hash('oldpassword') : null,
    emailVerifiedAt: NOW,
  })
  await users.save(user)
  return {
    users,
    hasher,
    changePassword: makeChangePassword({ users, hasher }),
    renameUser: makeRenameUser({ users }),
    deleteUser: makeDeleteUser({ users }),
  }
}

describe('changePassword', () => {
  it('replaces the hash when the current password matches', async () => {
    const ctx = await setup()
    await ctx.changePassword(ID.user, {
      currentPassword: 'oldpassword',
      newPassword: 'brandnewpass',
    })
    const saved = await ctx.users.findById(ID.user)
    expect(saved?.passwordHash).toBe('hashed:brandnewpass')
  })

  it('rejects a wrong current password', async () => {
    const ctx = await setup()
    await expect(
      ctx.changePassword(ID.user, {
        currentPassword: 'wrong',
        newPassword: 'brandnewpass',
      }),
    ).rejects.toThrow(/incorrect/i)
  })

  it('rejects when the account has no password set', async () => {
    const ctx = await setup(false)
    await expect(
      ctx.changePassword(ID.user, {
        currentPassword: 'whatever',
        newPassword: 'brandnewpass',
      }),
    ).rejects.toThrow(/no password/i)
  })

  it('throws for an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.changePassword(UNKNOWN, {
        currentPassword: 'oldpassword',
        newPassword: 'brandnewpass',
      }),
    ).rejects.toThrow()
  })
})

describe('renameUser', () => {
  it('renames the user', async () => {
    const ctx = await setup()
    const view = await ctx.renameUser(ID.user, { displayName: 'Noiva' })
    expect(view.displayName).toBe('Noiva')
  })

  it('throws for an unknown user', async () => {
    const ctx = await setup()
    await expect(
      ctx.renameUser(UNKNOWN, { displayName: 'Noiva' }),
    ).rejects.toThrow()
  })

  it('rejects an empty display name', async () => {
    const ctx = await setup()
    await expect(
      ctx.renameUser(ID.user, { displayName: '   ' }),
    ).rejects.toThrow()
  })
})

describe('deleteUser', () => {
  it('removes the user', async () => {
    const ctx = await setup()
    await ctx.deleteUser(ID.user)
    expect(await ctx.users.findById(ID.user)).toBeNull()
  })

  it('throws for an unknown user', async () => {
    const ctx = await setup()
    await expect(ctx.deleteUser(UNKNOWN)).rejects.toThrow()
  })
})
