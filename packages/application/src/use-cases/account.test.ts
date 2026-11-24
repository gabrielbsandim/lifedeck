import { describe, expect, it } from 'vitest'
import { User } from '@lifedeck/domain'
import { makeChangePassword } from '@/use-cases/change-password'
import { makeRenameUser } from '@/use-cases/rename-user'
import { makeDeleteUser } from '@/use-cases/delete-user'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryConversationStore } from '@/testing/in-memory-conversation-store'
import { FakePasswordHasher } from '@/testing/fake-password-hasher'
import { InMemorySessionRevocationStore } from '@/testing/in-memory-session-revocation-store'
import { makeRevokeSessions } from '@/use-cases/revoke-sessions'
import { FixedClock, ID } from '@/testing/fakes'

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
  const conversations = new InMemoryConversationStore()
  const sessions = new InMemorySessionRevocationStore()
  const clock = new FixedClock(NOW)
  return {
    users,
    hasher,
    conversations,
    sessions,
    changePassword: makeChangePassword({ users, hasher, sessions, clock }),
    revokeSessions: makeRevokeSessions({ sessions, clock }),
    renameUser: makeRenameUser({ users }),
    deleteUser: makeDeleteUser({ users, conversations }),
  }
}

describe('revokeSessions', () => {
  it('marks every earlier session of the user as revoked', async () => {
    const ctx = await setup()
    await expect(ctx.revokeSessions(ID.user)).resolves.toEqual(NOW)
    expect(await ctx.sessions.validFrom(ID.user)).toEqual(NOW)
    expect(await ctx.sessions.validFrom(ID.otherUser)).toBeNull()
  })
})

describe('changePassword', () => {
  it('replaces the hash when the current password matches', async () => {
    const ctx = await setup()
    await ctx.changePassword(ID.user, {
      currentPassword: 'oldpassword',
      newPassword: 'brandnewpass',
    })
    const saved = await ctx.users.findById(ID.user)
    expect(saved?.passwordHash).toBe('hashed:brandnewpass')
    expect(await ctx.sessions.validFrom(ID.user)).toEqual(NOW)
  })

  it('rejects a wrong current password', async () => {
    const ctx = await setup()
    await expect(
      ctx.changePassword(ID.user, {
        currentPassword: 'wrong',
        newPassword: 'brandnewpass',
      }),
    ).rejects.toThrow(/incorrect/i)
    expect(await ctx.sessions.validFrom(ID.user)).toBeNull()
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
  it('removes the user and clears their conversation log', async () => {
    const ctx = await setup()
    await ctx.conversations.append(ID.user, [{ role: 'user', content: 'hi' }])
    await ctx.deleteUser(ID.user)
    expect(await ctx.users.findById(ID.user)).toBeNull()
    expect(await ctx.conversations.load(ID.user)).toEqual([])
  })

  it('throws for an unknown user', async () => {
    const ctx = await setup()
    await expect(ctx.deleteUser(UNKNOWN)).rejects.toThrow()
  })
})
