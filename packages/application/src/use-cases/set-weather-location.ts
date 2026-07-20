import { asEntityId } from '@lifedeck/domain'
import { weatherLocationSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeSetWeatherLocation({ users }: Dependencies) {
  return async function setWeatherLocation(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { location } = weatherLocationSchema.parse(input)
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    user.setWeatherLocation(location)
    await users.save(user)
    return toUserView(user)
  }
}
