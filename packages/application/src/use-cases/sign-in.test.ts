import { describe, expect, it } from 'vitest'
import { User } from '@taskin/domain'
import { makeSignInWithEmail } from '@/use-cases/sign-in-with-email'
import { makeSignInWithGoogle } from '@/use-cases/sign-in-with-google'
import { makeGetGoogleAuthUrl } from '@/use-cases/get-google-auth-url'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { FakePasswordHasher } from '@/testing/fake-password-hasher'
import { FakeOAuthProvider } from '@/testing/fake-oauth-provider'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')

async function registeredUser(
  users: InMemoryUserRepository,
  hasher: FakePasswordHasher,
) {
  const user = User.createGuest({
    id: ID.user,
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: NOW,
  })
  user.register({
    email: 'gab@example.com',
    passwordHash: await hasher.hash('supersecret'),
    emailVerifiedAt: NOW,
  })
  await users.save(user)
  return user
}

describe('signInWithEmail', () => {
  function setup() {
    const users = new InMemoryUserRepository()
    const hasher = new FakePasswordHasher()
    return {
      users,
      hasher,
      signIn: makeSignInWithEmail({ users, hasher }),
    }
  }

  it('returns the user for matching credentials', async () => {
    const ctx = setup()
    await registeredUser(ctx.users, ctx.hasher)
    const view = await ctx.signIn({
      email: 'GAB@example.com',
      password: 'supersecret',
    })
    expect(view.id).toBe(ID.user)
  })

  it('rejects an unknown email', async () => {
    const ctx = setup()
    await expect(
      ctx.signIn({ email: 'nobody@example.com', password: 'whatever' }),
    ).rejects.toThrow(/invalid/i)
  })

  it('rejects a wrong password', async () => {
    const ctx = setup()
    await registeredUser(ctx.users, ctx.hasher)
    await expect(
      ctx.signIn({ email: 'gab@example.com', password: 'wrong' }),
    ).rejects.toThrow(/invalid/i)
  })

  it('rehashes a legacy password hash on a successful sign-in', async () => {
    const ctx = setup()
    const user = User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      createdAt: NOW,
    })
    user.register({
      email: 'gab@example.com',
      passwordHash: 'legacy:supersecret',
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(user)

    await ctx.signIn({ email: 'gab@example.com', password: 'supersecret' })

    const saved = await ctx.users.findById(ID.user)
    expect(saved?.passwordHash).toBe('hashed:supersecret')
  })

  it('does not resave when the hash is already current', async () => {
    const ctx = setup()
    await registeredUser(ctx.users, ctx.hasher)
    const before = (await ctx.users.findById(ID.user))?.passwordHash
    await ctx.signIn({ email: 'gab@example.com', password: 'supersecret' })
    const after = (await ctx.users.findById(ID.user))?.passwordHash
    expect(after).toBe(before)
  })

  it('rejects an account without a password (OAuth only)', async () => {
    const ctx = setup()
    const user = User.createGuest({
      id: ID.user,
      displayName: 'Gabriel',
      locale: 'en',
      createdAt: NOW,
    })
    user.register({
      email: 'gab@example.com',
      passwordHash: null,
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(user)
    await expect(
      ctx.signIn({ email: 'gab@example.com', password: 'supersecret' }),
    ).rejects.toThrow(/invalid/i)
  })
})

describe('signInWithGoogle', () => {
  function setup(provider = new FakeOAuthProvider()) {
    const users = new InMemoryUserRepository()
    return {
      users,
      signIn: makeSignInWithGoogle({
        users,
        oauth: provider,
        ids: new SequentialIdGenerator([ID.user]),
        clock: new FixedClock(NOW),
      }),
    }
  }

  it('creates a verified registered user on first sign-in', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'New@Example.com',
        displayName: 'New Person',
        emailVerified: true,
      }),
    )
    const view = await ctx.signIn('auth-code')
    expect(view.email).toBe('new@example.com')
    expect(view.isGuest).toBe(false)
    expect(view.isEmailVerified).toBe(true)
    expect(view.displayName).toBe('New Person')
  })

  it('returns the existing user when the email is known', async () => {
    const ctx = setup()
    const existing = User.createGuest({
      id: ID.otherUser,
      displayName: 'Existing',
      locale: 'en',
      createdAt: NOW,
    })
    existing.register({
      email: 'oauth@example.com',
      passwordHash: null,
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(existing)

    const view = await ctx.signIn('auth-code')
    expect(view.id).toBe(ID.otherUser)
  })

  it('falls back to the email local part when the profile name is blank', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'solo@example.com',
        displayName: '   ',
        emailVerified: true,
      }),
    )
    const view = await ctx.signIn('auth-code')
    expect(view.displayName).toBe('solo')
  })

  it('rejects an unverified Google email', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'unverified@example.com',
        displayName: 'Nope',
        emailVerified: false,
      }),
    )
    await expect(ctx.signIn('auth-code')).rejects.toThrow(/not verified/i)
  })
})

describe('getGoogleAuthUrl', () => {
  it('delegates to the provider with the state', () => {
    const getUrl = makeGetGoogleAuthUrl({ oauth: new FakeOAuthProvider() })
    expect(getUrl('xyz')).toBe('https://oauth.test/authorize?state=xyz')
  })
})
