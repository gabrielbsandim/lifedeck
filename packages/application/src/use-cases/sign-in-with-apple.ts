import { ValidationError, asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import type { AppleGrants } from '@/ports/apple-grant'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { IdentityTokenVerifier } from '@/ports/identity-token-verifier'
import type { UserRepository } from '@/ports/user-repository'
import { makeSignInWithProfile } from '@/use-cases/sign-in-with-profile'

const NAME_MAX = 80
const FALLBACK_NAME = 'Friend'

export type AppleSignInInput = {
  identityToken: string
  // Apple shares the name with the app once, on the first authorization, and
  // never puts it in the token, so the client forwards it.
  fullName?: string | null
  // Kept as a refresh token so deleting the account can revoke the grant.
  authorizationCode?: string | null
}

type Dependencies = {
  users: UserRepository
  apple: IdentityTokenVerifier
  ids: IdGenerator
  clock: Clock
  grants?: AppleGrants
}

export function makeSignInWithApple({
  users,
  apple,
  ids,
  clock,
  grants,
}: Dependencies) {
  const signInWithProfile = makeSignInWithProfile({ users, ids, clock })
  return async function signInWithApple(
    input: AppleSignInInput,
    guestId?: string | null,
  ): Promise<UserView> {
    const profile = await apple.verify(input.identityToken)
    if (!profile.emailVerified) {
      throw new ValidationError('This Apple ID email is not verified.')
    }
    // A hidden email is a random relay address, so its local part would make
    // a meaningless display name.
    const displayName =
      input.fullName?.trim().slice(0, NAME_MAX) || FALLBACK_NAME
    const user = await signInWithProfile({ ...profile, displayName }, guestId)
    const code = input.authorizationCode
    if (!grants || !code) {
      return user
    }
    // A failed exchange must not cost the user a sign-in; the next one retries.
    await grants.client
      .exchange(code)
      .then(token => grants.store.save(asEntityId(user.id), token))
      .catch(() => undefined)
    return user
  }
}
