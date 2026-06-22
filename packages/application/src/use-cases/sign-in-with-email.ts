import { ValidationError } from '@taskin/domain'
import { signInSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import type { PasswordHasher } from '@/ports/password-hasher'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  hasher: PasswordHasher
}

export function makeSignInWithEmail({ users, hasher }: Dependencies) {
  return async function signInWithEmail(input: unknown): Promise<UserView> {
    const { email, password } = signInSchema.parse(input)

    const user = await users.findByEmail(email.trim().toLowerCase())
    if (!user || !user.passwordHash) {
      throw new ValidationError('Invalid email or password.')
    }

    const matches = await hasher.verify(password, user.passwordHash)
    if (!matches) {
      throw new ValidationError('Invalid email or password.')
    }

    if (hasher.needsRehash(user.passwordHash)) {
      user.changePassword(await hasher.hash(password))
      await users.save(user)
    }

    return toUserView(user)
  }
}
