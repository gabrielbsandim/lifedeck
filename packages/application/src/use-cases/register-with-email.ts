import {
  EmailVerification,
  ValidationError,
  asEntityId,
} from '@lifedeck/domain'
import { registerSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { CodeGenerator } from '@/ports/code-generator'
import type { EmailLocale, EmailSender } from '@/ports/email-sender'
import type { EmailVerificationRepository } from '@/ports/email-verification-repository'
import type { IdGenerator } from '@/ports/id-generator'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { UserRepository } from '@/ports/user-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

const VERIFICATION_TTL_MINUTES = 15

type Dependencies = {
  users: UserRepository
  emailVerifications: EmailVerificationRepository
  hasher: PasswordHasher
  codes: CodeGenerator
  emailSender: EmailSender
  ids: IdGenerator
  clock: Clock
  unitOfWork: UnitOfWork
}

export function makeRegisterWithEmail({
  users,
  emailVerifications,
  hasher,
  codes,
  emailSender,
  ids,
  clock,
  unitOfWork,
}: Dependencies) {
  return async function registerWithEmail(
    userId: string,
    input: unknown,
    locale: EmailLocale = 'en',
  ): Promise<UserView> {
    const { email, password } = registerSchema.parse(input)

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const existing = await users.findByEmail(normalizedEmail)
    if (existing && existing.id !== user.id) {
      throw new ValidationError('This email is already registered.')
    }

    user.register({
      email: normalizedEmail,
      passwordHash: await hasher.hash(password),
      emailVerifiedAt: null,
    })
    await users.save(user)

    await sendVerificationCode({
      user,
      emailVerifications,
      hasher,
      codes,
      emailSender,
      ids,
      clock,
      locale,
      unitOfWork,
    })

    return toUserView(user)
  }
}

export async function sendVerificationCode({
  user,
  emailVerifications,
  hasher,
  codes,
  emailSender,
  ids,
  clock,
  locale = 'en',
  unitOfWork,
}: {
  user: { id: string; email: string | null }
  emailVerifications: EmailVerificationRepository
  hasher: PasswordHasher
  codes: CodeGenerator
  emailSender: EmailSender
  ids: IdGenerator
  clock: Clock
  locale?: EmailLocale
  unitOfWork: UnitOfWork
}): Promise<void> {
  if (!user.email) {
    throw new ValidationError('This account has no email to verify.')
  }
  const code = codes.generate()
  const now = clock.now()
  const expiresAt = new Date(now.getTime() + VERIFICATION_TTL_MINUTES * 60_000)
  const verification = EmailVerification.create({
    id: ids.generate(),
    userId: asEntityId(user.id),
    codeHash: await hasher.hash(code),
    expiresAt,
    createdAt: now,
  })
  await unitOfWork.run(async () => {
    await emailVerifications.deleteByUserId(asEntityId(user.id))
    await emailVerifications.save(verification)
  })
  await emailSender.sendVerificationCode(user.email, code, locale)
}
