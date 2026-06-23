import { describe, expect, it } from 'vitest'
import { User, asEntityId } from '@lifedeck/domain'
import { makeRegisterWithEmail } from '@/use-cases/register-with-email'
import { makeRequestEmailVerification } from '@/use-cases/request-email-verification'
import { makeVerifyEmail } from '@/use-cases/verify-email'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryEmailVerificationRepository } from '@/testing/in-memory-email-verification-repository'
import { FakePasswordHasher } from '@/testing/fake-password-hasher'
import { FakeEmailSender } from '@/testing/fake-email-sender'
import { FakeCodeGenerator } from '@/testing/fake-code-generator'
import { FixedClock, ID, SequentialIdGenerator } from '@/testing/fakes'

const NOW = new Date('2026-06-22T10:00:00.000Z')
const UNKNOWN = '00000000-0000-4000-8000-000000000000'

function setup() {
  const users = new InMemoryUserRepository()
  const emailVerifications = new InMemoryEmailVerificationRepository()
  const hasher = new FakePasswordHasher()
  const emailSender = new FakeEmailSender()
  const clock = new FixedClock(NOW)
  const deps = {
    users,
    emailVerifications,
    hasher,
    codes: new FakeCodeGenerator('123456'),
    emailSender,
    ids: new SequentialIdGenerator([ID.verification]),
    clock,
  }
  return {
    users,
    emailVerifications,
    hasher,
    emailSender,
    clock,
    registerWithEmail: makeRegisterWithEmail(deps),
    requestEmailVerification: makeRequestEmailVerification(deps),
    verifyEmail: makeVerifyEmail({ users, emailVerifications, hasher, clock }),
  }
}

async function saveGuest(users: InMemoryUserRepository, id = ID.user) {
  const user = User.createGuest({
    id,
    displayName: 'Gabriel',
    locale: 'en',
    createdAt: NOW,
  })
  await users.save(user)
  return user
}

describe('registerWithEmail', () => {
  it('upgrades the guest, hashes the password, stores a code and emails it', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)

    const view = await ctx.registerWithEmail(ID.user, {
      email: 'Gab@Example.com',
      password: 'supersecret',
    })

    expect(view.email).toBe('gab@example.com')
    expect(view.isGuest).toBe(false)
    expect(view.isEmailVerified).toBe(false)

    const saved = await ctx.users.findById(ID.user)
    expect(saved?.passwordHash).toBe('hashed:supersecret')
    expect(await ctx.emailVerifications.findByUserId(ID.user)).not.toBeNull()
    expect(ctx.emailSender.sent).toEqual([
      { to: 'gab@example.com', code: '123456', locale: 'en' },
    ])
  })

  it('emails the verification code in the requested locale', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)

    await ctx.registerWithEmail(
      ID.user,
      { email: 'gab@example.com', password: 'supersecret' },
      'pt',
    )

    expect(ctx.emailSender.sent[0]?.locale).toBe('pt')
  })

  it('rejects an email already registered to another user', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)
    const other = await saveGuest(ctx.users, ID.otherUser)
    other.register({
      email: 'taken@example.com',
      passwordHash: 'x',
      emailVerifiedAt: null,
    })
    await ctx.users.save(other)

    await expect(
      ctx.registerWithEmail(ID.user, {
        email: 'taken@example.com',
        password: 'supersecret',
      }),
    ).rejects.toThrow(/already registered/i)
  })

  it('throws when the user does not exist', async () => {
    const ctx = setup()
    await expect(
      ctx.registerWithEmail(UNKNOWN, {
        email: 'gab@example.com',
        password: 'supersecret',
      }),
    ).rejects.toThrow()
  })

  it('rejects a password shorter than 8 characters', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)
    await expect(
      ctx.registerWithEmail(ID.user, {
        email: 'gab@example.com',
        password: 'short',
      }),
    ).rejects.toThrow()
  })
})

describe('requestEmailVerification', () => {
  it('regenerates and re-sends a code for an unverified account', async () => {
    const ctx = setup()
    const user = await saveGuest(ctx.users)
    user.register({
      email: 'gab@example.com',
      passwordHash: 'x',
      emailVerifiedAt: null,
    })
    await ctx.users.save(user)

    await ctx.requestEmailVerification(ID.user)
    expect(ctx.emailSender.sent).toEqual([
      { to: 'gab@example.com', code: '123456', locale: 'en' },
    ])
  })

  it('throws when the user has no email', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)
    await expect(ctx.requestEmailVerification(ID.user)).rejects.toThrow(
      /no email/i,
    )
  })

  it('throws when the email is already verified', async () => {
    const ctx = setup()
    const user = await saveGuest(ctx.users)
    user.register({
      email: 'gab@example.com',
      passwordHash: 'x',
      emailVerifiedAt: NOW,
    })
    await ctx.users.save(user)
    await expect(ctx.requestEmailVerification(ID.user)).rejects.toThrow(
      /already verified/i,
    )
  })

  it('throws when the user does not exist', async () => {
    const ctx = setup()
    await expect(ctx.requestEmailVerification(UNKNOWN)).rejects.toThrow()
  })
})

describe('verifyEmail', () => {
  async function register(ctx: ReturnType<typeof setup>) {
    await saveGuest(ctx.users)
    await ctx.registerWithEmail(ID.user, {
      email: 'gab@example.com',
      password: 'supersecret',
    })
  }

  it('verifies a valid code and clears the stored verification', async () => {
    const ctx = setup()
    await register(ctx)

    const view = await ctx.verifyEmail(ID.user, { code: '123456' })

    expect(view.isEmailVerified).toBe(true)
    expect(await ctx.emailVerifications.findByUserId(ID.user)).toBeNull()
  })

  it('rejects an invalid code', async () => {
    const ctx = setup()
    await register(ctx)
    await expect(ctx.verifyEmail(ID.user, { code: '000000' })).rejects.toThrow(
      /invalid/i,
    )
  })

  it('rejects an expired code', async () => {
    const ctx = setup()
    await register(ctx)
    const later = makeVerifyEmail({
      users: ctx.users,
      emailVerifications: ctx.emailVerifications,
      hasher: ctx.hasher,
      clock: new FixedClock(new Date('2026-06-22T11:00:00.000Z')),
    })
    await expect(later(ID.user, { code: '123456' })).rejects.toThrow(/expired/i)
  })

  it('throws when there is no pending verification', async () => {
    const ctx = setup()
    await saveGuest(ctx.users)
    await expect(ctx.verifyEmail(ID.user, { code: '123456' })).rejects.toThrow()
  })

  it('throws when the user vanished after the code was issued', async () => {
    const ctx = setup()
    await register(ctx)
    await ctx.users.delete(asEntityId(ID.user))
    await expect(ctx.verifyEmail(ID.user, { code: '123456' })).rejects.toThrow()
  })
})
