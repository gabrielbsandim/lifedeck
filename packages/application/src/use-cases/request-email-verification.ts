import { ValidationError, asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import { sendVerificationCode } from '@/use-cases/register-with-email'
import type { Clock } from '@/ports/clock'
import type { CodeGenerator } from '@/ports/code-generator'
import type { EmailLocale, EmailSender } from '@/ports/email-sender'
import type { EmailVerificationRepository } from '@/ports/email-verification-repository'
import type { IdGenerator } from '@/ports/id-generator'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { UserRepository } from '@/ports/user-repository'
import type { UnitOfWork } from '@/ports/unit-of-work'

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

export function makeRequestEmailVerification({
  users,
  emailVerifications,
  hasher,
  codes,
  emailSender,
  ids,
  clock,
  unitOfWork,
}: Dependencies) {
  return async function requestEmailVerification(
    userId: string,
    locale: EmailLocale = 'en',
  ): Promise<UserView> {
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    if (!user.email) {
      throw new ValidationError('This account has no email to verify.')
    }
    if (user.isEmailVerified) {
      throw new ValidationError('This email is already verified.')
    }

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
