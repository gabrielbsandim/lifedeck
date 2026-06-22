import { asEntityId } from '@taskin/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeDeleteUser({ users }: Dependencies) {
  return async function deleteUser(userId: string): Promise<void> {
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    await users.delete(asEntityId(userId))
  }
}
