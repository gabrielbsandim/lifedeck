import { asEntityId } from '@taskin/domain'
import { renameUserSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeRenameUser({ users }: Dependencies) {
  return async function renameUser(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { displayName } = renameUserSchema.parse(input)

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }

    user.rename(displayName)
    await users.save(user)

    return toUserView(user)
  }
}
