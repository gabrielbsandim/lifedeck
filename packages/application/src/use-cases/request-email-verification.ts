import { ValidationError, asEntityId } from '@taskin/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import { sendVerificationCode } from '@/use-cases/register-with-email'
import type { Clock } from '@/ports/clock'
import type { CodeGenerator } from '@/ports/code-generator'
import type { EmailSender } from '@/ports/email-sender'
import type { EmailVerificationRepository } from '@/ports/email-verification-repository'
import type { IdGenerator } from '@/ports/id-generator'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  emailVerifications: EmailVerificationRepository
  hasher: PasswordHasher
  codes: CodeGenerator
  emailSender: EmailSender
  ids: IdGenerator
  clock: Clock
}

export function makeRequestEmailVerification({
  users,
  emailVerifications,
  hasher,
  codes,
  emailSender,
  ids,
  clock,
}: Dependencies) {
  return async function requestEmailVerification(
    userId: string,
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
    })

    return toUserView(user)
  }
}
