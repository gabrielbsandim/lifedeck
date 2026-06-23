import { asEntityId } from '@lifedeck/domain'
import { carryOverModeSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeSetCarryOverMode({ users }: Dependencies) {
  return async function setCarryOverMode(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { mode } = carryOverModeSchema.parse(input)
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    user.setCarryOverMode(mode)
    await users.save(user)
    return toUserView(user)
  }
}
