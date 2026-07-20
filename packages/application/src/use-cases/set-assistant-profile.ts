import { asEntityId } from '@lifedeck/domain'
import { setAssistantProfileSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeSetAssistantProfile({ users }: Dependencies) {
  return async function setAssistantProfile(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const { addNote, people, ...patch } = setAssistantProfileSchema.parse(input)
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    user.updateProfile({
      ...patch,
      ...(people
        ? {
            people: people.map(person => ({
              name: person.name,
              relationship: person.relationship ?? null,
            })),
          }
        : {}),
    })
    if (addNote) {
      user.rememberNote(addNote)
    }
    await users.save(user)
    return toUserView(user)
  }
}
