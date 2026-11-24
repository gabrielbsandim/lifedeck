import { User, asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { OAuthProfile } from '@/ports/oauth-provider'
import type { UserRepository } from '@/ports/user-repository'

const DEFAULT_LOCALE = 'en'

type Dependencies = {
  users: UserRepository
  ids: IdGenerator
  clock: Clock
}

// Accounts are keyed by email, so a provider whose email is verified signs in
// to the account that already owns it, whichever way it was created.
export function makeSignInWithProfile({ users, ids, clock }: Dependencies) {
  // If the visitor started as a guest (name + lists, not yet registered),
  // claim that same account so their lists carry over instead of being
  // orphaned under a brand-new user id.
  async function claimGuest(
    guestId: string | null | undefined,
    email: string,
    avatarUrl: string | null,
    now: Date,
  ): Promise<UserView | null> {
    const guest = guestId ? await users.findById(asEntityId(guestId)) : null
    if (!guest || !guest.isGuest || guest.email) {
      return null
    }
    guest.register({ email, passwordHash: null, emailVerifiedAt: now })
    if (avatarUrl) {
      guest.setAvatar(avatarUrl)
    }
    await users.save(guest)
    return toUserView(guest)
  }

  return async function signInWithProfile(
    profile: OAuthProfile,
    guestId?: string | null,
  ): Promise<UserView> {
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

    const claimed = await claimGuest(guestId, email, avatarUrl, now)
    if (claimed) {
      return claimed
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
