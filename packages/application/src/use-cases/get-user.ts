import { asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeGetUser({ users }: Dependencies) {
  return async function getUser(id: string): Promise<UserView> {
    const user = await users.findById(asEntityId(id))
    if (!user) {
      throw new NotFoundError('User')
    }
    return toUserView(user)
  }
}
