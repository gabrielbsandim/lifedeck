import { asEntityId } from '@lifedeck/domain'
import { timezoneSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeSetTimezone({ users }: Dependencies) {
  return async function setTimezone(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { timezone } = timezoneSchema.parse(input)
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    user.setTimezone(timezone)
    await users.save(user)
    return toUserView(user)
  }
}
