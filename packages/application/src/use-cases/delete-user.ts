import { asEntityId } from '@lifedeck/domain'
import { NotFoundError } from '@/errors/use-case-error'
import type { ConversationStore } from '@/ports/conversation-store'
import type { UserRepository } from '@/ports/user-repository'

type Dependencies = {
  users: UserRepository
  conversations: ConversationStore
}

export function makeDeleteUser({ users, conversations }: Dependencies) {
  return async function deleteUser(userId: string): Promise<void> {
    const user = await users.findById(asEntityId(userId))
    if (!user) {
      throw new NotFoundError('User')
    }
    // Relational children (subscriptions, usage, calendar, channel identities)
    // are removed by Postgres FK cascade; the conversation log lives in Redis
    // and must be cleared explicitly.
    await conversations.clear(userId)
    await users.delete(asEntityId(userId))
  }
}
