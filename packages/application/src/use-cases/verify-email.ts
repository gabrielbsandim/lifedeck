import { ValidationError, asEntityId } from '@lifedeck/domain'
import { verifyEmailSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { EmailVerificationRepository } from '@/ports/email-verification-repository'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  emailVerifications: EmailVerificationRepository
  hasher: PasswordHasher
  clock: Clock
}

export function makeVerifyEmail({
  users,
  emailVerifications,
  hasher,
  clock,
}: Dependencies) {
  return async function verifyEmail(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { code } = verifyEmailSchema.parse(input)

    const verification = await emailVerifications.findByUserId(
      asEntityId(userId),
    )
    if (!verification) {
      throw new NotFoundError('Verification code')
    }
    if (verification.isExpired(clock.now())) {
      throw new ValidationError('This verification code has expired.')
    }

    const matches = await hasher.verify(code, verification.codeHash)
    if (!matches) {
      throw new ValidationError('This verification code is invalid.')
    }

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }

    user.verifyEmail(clock.now())
    await users.save(user)
    await emailVerifications.deleteByUserId(asEntityId(userId))

    return toUserView(user)
  }
}
