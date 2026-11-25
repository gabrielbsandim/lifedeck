import { describe, expect, it } from 'vitest'
import { User, asEntityId } from '@lifedeck/domain'
import { makeSignInWithEmail } from '@/use-cases/sign-in-with-email'
import { makeSignInWithGoogle } from '@/use-cases/sign-in-with-google'
import { makeGetGoogleAuthUrl } from '@/use-cases/get-google-auth-url'
import { makeSignInWithApple } from '@/use-cases/sign-in-with-apple'
import {
  FakeAppleTokenClient,
  InMemoryAppleGrantStore,
} from '@/testing/in-memory-apple-grants'
import {
  FakeIdentityTokenVerifier,
  VALID_IDENTITY_TOKEN,
} from '@/testing/fake-identity-token-verifier'
import { InvalidIdentityTokenError } from '@/errors/use-case-error'
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

  it('imports the Google profile picture as the initial avatar', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'pic@example.com',
        displayName: 'Pic Person',
        emailVerified: true,
        avatarUrl: 'https://lh3.googleusercontent.com/a/pic',
      }),
    )
    const view = await ctx.signIn('auth-code')
    expect(view.avatarUrl).toBe('https://lh3.googleusercontent.com/a/pic')
  })

  it('ignores a non-https profile picture', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'nopic@example.com',
        displayName: 'No Pic',
        emailVerified: true,
        avatarUrl: 'http://insecure.example.com/p.png',
      }),
    )
    const view = await ctx.signIn('auth-code')
    expect(view.avatarUrl).toBeNull()
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

  it('claims the current guest so their lists carry over', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'guest@example.com',
        displayName: 'From Google',
        emailVerified: true,
        avatarUrl: 'https://lh3.googleusercontent.com/a/guest',
      }),
    )
    const guest = User.createGuest({
      id: ID.otherUser,
      displayName: 'Guest Name',
      locale: 'en',
      createdAt: NOW,
    })
    await ctx.users.save(guest)

    const view = await ctx.signIn('auth-code', ID.otherUser)

    expect(view.id).toBe(ID.otherUser)
    expect(view.email).toBe('guest@example.com')
    expect(view.isGuest).toBe(false)
    expect(view.displayName).toBe('Guest Name')
    expect(view.avatarUrl).toBe('https://lh3.googleusercontent.com/a/guest')
  })

  it('creates a new user when the guest is already registered', async () => {
    const ctx = setup(
      new FakeOAuthProvider({
        email: 'fresh@example.com',
        displayName: 'Fresh',
        emailVerified: true,
      }),
    )
    const registered = User.createGuest({
      id: ID.otherUser,
      displayName: 'Already',
      locale: 'en',
      createdAt: NOW,
    })
    registered.register({
      email: 'already@example.com',
      passwordHash: null,
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(registered)

    const view = await ctx.signIn('auth-code', ID.otherUser)

    expect(view.id).toBe(ID.user)
    expect(view.email).toBe('fresh@example.com')
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

describe('signInWithApple grant', () => {
  function setup() {
    const client = new FakeAppleTokenClient()
    const store = new InMemoryAppleGrantStore()
    const signIn = makeSignInWithApple({
      users: new InMemoryUserRepository(),
      apple: new FakeIdentityTokenVerifier(),
      ids: new SequentialIdGenerator([ID.user]),
      clock: new FixedClock(NOW),
      grants: { client, store },
    })
    return { client, store, signIn }
  }

  it('stores the refresh token traded for the authorization code', async () => {
    const ctx = setup()
    const view = await ctx.signIn({
      identityToken: VALID_IDENTITY_TOKEN,
      authorizationCode: 'code-1',
    })
    expect(await ctx.store.find(asEntityId(view.id))).toBe('refresh:code-1')
  })

  it('stores nothing without an authorization code', async () => {
    const ctx = setup()
    const view = await ctx.signIn({ identityToken: VALID_IDENTITY_TOKEN })
    expect(await ctx.store.find(asEntityId(view.id))).toBeNull()
  })

  it('still signs in when Apple refuses the code', async () => {
    const ctx = setup()
    ctx.client.failWith = new Error('invalid_grant')
    const view = await ctx.signIn({
      identityToken: VALID_IDENTITY_TOKEN,
      authorizationCode: 'code-1',
    })
    expect(view.email).toBe('apple@example.com')
    expect(await ctx.store.find(asEntityId(view.id))).toBeNull()
  })
})

describe('signInWithApple', () => {
  function setup(verifier = new FakeIdentityTokenVerifier()) {
    const users = new InMemoryUserRepository()
    return {
      users,
      signIn: makeSignInWithApple({
        users,
        apple: verifier,
        ids: new SequentialIdGenerator([ID.user]),
        clock: new FixedClock(NOW),
      }),
    }
  }

  it('creates a verified user named from the first authorization', async () => {
    const ctx = setup()
    const view = await ctx.signIn({
      identityToken: VALID_IDENTITY_TOKEN,
      fullName: '  Ana Souza  ',
    })
    expect(view.email).toBe('apple@example.com')
    expect(view.isEmailVerified).toBe(true)
    expect(view.displayName).toBe('Ana Souza')
  })

  it('never names a user after a hidden relay address', async () => {
    const ctx = setup(
      new FakeIdentityTokenVerifier({
        email: 'x7k2p9@privaterelay.appleid.com',
        displayName: '',
        emailVerified: true,
      }),
    )
    const view = await ctx.signIn({ identityToken: VALID_IDENTITY_TOKEN })
    expect(view.displayName).toBe('Friend')
  })

  it('signs in to the account that already owns the email', async () => {
    const ctx = setup()
    const existing = User.createGuest({
      id: ID.otherUser,
      displayName: 'Existing',
      locale: 'en',
      createdAt: NOW,
    })
    existing.register({
      email: 'apple@example.com',
      passwordHash: null,
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(existing)
    const view = await ctx.signIn({ identityToken: VALID_IDENTITY_TOKEN })
    expect(view.id).toBe(ID.otherUser)
  })

  it('claims the guest account that made the request', async () => {
    const ctx = setup()
    const guest = User.createGuest({
      id: ID.otherUser,
      displayName: 'Guest Name',
      locale: 'en',
      createdAt: NOW,
    })
    await ctx.users.save(guest)
    const view = await ctx.signIn(
      { identityToken: VALID_IDENTITY_TOKEN },
      ID.otherUser,
    )
    expect(view.id).toBe(ID.otherUser)
    expect(view.isGuest).toBe(false)
  })

  it('rejects a bad token and an unverified email', async () => {
    await expect(
      setup().signIn({ identityToken: 'forged' }),
    ).rejects.toBeInstanceOf(InvalidIdentityTokenError)
    const unverified = setup(
      new FakeIdentityTokenVerifier({
        email: 'a@example.com',
        displayName: '',
        emailVerified: false,
      }),
    )
    await expect(
      unverified.signIn({ identityToken: VALID_IDENTITY_TOKEN }),
    ).rejects.toThrow('not verified')
  })
})
