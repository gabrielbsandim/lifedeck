import { asEntityId } from '@lifedeck/domain'
import { reminderPreferencesSchema, type UserView } from '@/dtos/user-dto'
import { toUserView } from '@/mappers/user-mapper'
import { NotFoundError } from '@/errors/use-case-error'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
}

export function makeSetReminderPreferences({ users }: Dependencies) {
  return async function setReminderPreferences(
    userId: string,
    input: unknown,
  ): Promise<UserView> {
    const prefs = reminderPreferencesSchema.parse(input)
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    user.setReminderChannels(prefs)
    await users.save(user)
    return toUserView(user)
  }
}
