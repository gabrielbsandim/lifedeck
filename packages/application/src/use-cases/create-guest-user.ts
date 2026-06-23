import { User } from '@lifedeck/domain'
import {
  guestSignInSchema,
  type GuestSignInInput,
  type UserView,
} from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { UserRepository } from '@/ports/user-repository'

const DEFAULT_LOCALE = 'en'

type Dependencies = {
  users: UserRepository
  ids: IdGenerator
  clock: Clock
}

export function makeCreateGuestUser({ users, ids, clock }: Dependencies) {
  return async function createGuestUser(
    input: GuestSignInInput,
  ): Promise<UserView> {
    const { displayName, locale, timezone } = guestSignInSchema.parse(input)

    const user = User.createGuest({
      id: ids.generate(),
      displayName,
      locale: locale ?? DEFAULT_LOCALE,
      timezone,
      createdAt: clock.now(),
    })

    await users.save(user)

    return toUserView(user)
  }
}
