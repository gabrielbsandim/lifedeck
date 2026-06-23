import { ValidationError, asEntityId } from '@lifedeck/domain'
import { type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { FileStorage } from '@/ports/file-storage'
import type { UserRepository } from '@/ports/user-repository'

const ALLOWED_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
const MAX_BYTES = 512 * 1024

export type AvatarInput = {
  data: Uint8Array
  contentType: string
}

type Dependencies = {
  users: UserRepository
  fileStorage: FileStorage
}

export function makeSetAvatar({ users, fileStorage }: Dependencies) {
  return async function setAvatar(
    userId: string,
    input: AvatarInput,
  ): Promise<UserView> {
    const extension = ALLOWED_TYPES[input.contentType]
    if (!extension) {
      throw new ValidationError(
        'Unsupported image type. Use PNG, JPEG or WebP.',
      )
    }
    if (input.data.byteLength === 0) {
      throw new ValidationError('The image is empty.')
    }
    if (input.data.byteLength > MAX_BYTES) {
      throw new ValidationError('The image must be 512 KB or smaller.')
    }

    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }

    const previous = user.avatarUrl
    const stored = await fileStorage.upload({
      key: `avatars/${userId}.${extension}`,
      data: input.data,
      contentType: input.contentType,
    })
    user.setAvatar(stored.url)
    await users.save(user)

    if (previous && previous !== stored.url) {
      try {
        await fileStorage.remove(previous)
      } catch {
        // Best-effort cleanup; a stale blob must not fail the request.
      }
    }

    return toUserView(user)
  }
}
