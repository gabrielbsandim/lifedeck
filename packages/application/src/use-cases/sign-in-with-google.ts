import { User, ValidationError, asEntityId } from '@lifedeck/domain'
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
  return async function signInWithGoogle(
    code: string,
    guestId?: string | null,
  ): Promise<UserView> {
    const profile = await oauth.exchangeCode(code)
    if (!profile.emailVerified) {
      throw new ValidationError('This Google account email is not verified.')
    }

    const email = profile.email.trim().toLowerCase()
    const existing = await users.findByEmail(email)
    if (existing) {
      return toUserView(existing)
    }

    const now = clock.now()
    const avatarUrl =
      profile.avatarUrl && /^https:\/\//i.test(profile.avatarUrl.trim())
        ? profile.avatarUrl.trim()
        : null

    // If the visitor started as a guest (name + lists, not yet registered),
    // claim that same account so their lists carry over instead of being
    // orphaned under a brand-new user id.
    if (guestId) {
      const guest = await users.findById(asEntityId(guestId))
      if (guest && guest.isGuest && !guest.email) {
        guest.register({ email, passwordHash: null, emailVerifiedAt: now })
        if (avatarUrl) {
          guest.setAvatar(avatarUrl)
        }
        await users.save(guest)
        return toUserView(guest)
      }
    }

    const displayName =
      profile.displayName.trim() || (email.split('@')[0] ?? 'Friend')
    const user = User.createGuest({
      id: ids.generate(),
      displayName,
      locale: DEFAULT_LOCALE,
      avatarUrl,
      createdAt: now,
    })
    user.register({ email, passwordHash: null, emailVerifiedAt: now })
    await users.save(user)

    return toUserView(user)
  }
}
