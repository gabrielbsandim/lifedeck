import { ValidationError } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { OAuthProvider } from '@/ports/oauth-provider'
import type { UserRepository } from '@/ports/user-repository'
import { makeSignInWithProfile } from '@/use-cases/sign-in-with-profile'

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
  const signInWithProfile = makeSignInWithProfile({ users, ids, clock })
  return async function signInWithGoogle(
    code: string,
    guestId?: string | null,
  ): Promise<UserView> {
    const profile = await oauth.exchangeCode(code)
    if (!profile.emailVerified) {
      throw new ValidationError('This Google account email is not verified.')
    }
    return signInWithProfile(profile, guestId)
  }
}
