import { ValidationError, asEntityId } from '@lifedeck/domain'
import { changePasswordSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { Clock } from '@/ports/clock'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { SessionRevocationStore } from '@/ports/session-revocation-store'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  hasher: PasswordHasher
  sessions: SessionRevocationStore
  clock: Clock
}

export function makeChangePassword({
  users,
  hasher,
  sessions,
  clock,
}: Dependencies) {
  return async function changePassword(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { currentPassword, newPassword } = changePasswordSchema.parse(input)

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    if (!user.passwordHash) {
      throw new ValidationError('This account has no password set.')
    }

    const matches = await hasher.verify(currentPassword, user.passwordHash)
    if (!matches) {
      throw new ValidationError('Your current password is incorrect.')
    }

    user.changePassword(await hasher.hash(newPassword))
    await users.save(user)
    // A leaked token must not outlive the password it was issued under.
    await sessions.revokeAll(user.id, clock.now())

    return toUserView(user)
  }
}
