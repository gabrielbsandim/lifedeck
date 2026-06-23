import { asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { FileStorage } from '@/ports/file-storage'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  fileStorage: FileStorage
}

export function makeRemoveAvatar({ users, fileStorage }: Dependencies) {
  return async function removeAvatar(userId: string): Promise<UserView> {
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }

    const previous = user.avatarUrl
    user.removeAvatar()
    await users.save(user)

    if (previous) {
      try {
        await fileStorage.remove(previous)
      } catch {
        // Best-effort cleanup.
      }
    }

    return toUserView(user)
  }
}
