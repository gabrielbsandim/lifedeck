import { User, ValidationError } from '@taskin/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { OAuthProvider } from '@/ports/oauth-provider'
import type { UserRepository } from '@/ports/user-repository'

const DEFAULT_LOCALE = 'en'

type Dependencies = {
  users: UserRepository
  oauth: OAuthProvider
  ids: IdGenerator
  clock: Clock
}

export function makeSignInWithGoogle({
  users,
  oauth,
  ids,
  clock,
}: Dependencies) {
  return async function signInWithGoogle(code: string): Promise<UserView> {
    const profile = await oauth.exchangeCode(code)
    if (!profile.emailVerified) {
      throw new ValidationError('This Google account email is not verified.')
    }

    const email = profile.email.trim().toLowerCase()
    const existing = await users.findByEmail(email)
    if (existing) {
      return toUserView(existing)
    }

    const displayName =
      profile.displayName.trim() || (email.split('@')[0] ?? 'Friend')
    const now = clock.now()
    const user = User.createGuest({
      id: ids.generate(),
      displayName,
      locale: DEFAULT_LOCALE,
      createdAt: now,
    })
    user.register({ email, passwordHash: null, emailVerifiedAt: now })
    await users.save(user)

    return toUserView(user)
  }
}
