import type { ConversationStore } from '@/ports/conversation-store'

export type AssistantHistoryMessage = {
  role: 'user' | 'assistant'
  text: string
}

type Dependencies = {
  conversations: ConversationStore
}

// The chat screen renders text only: the recorded actions are a memory aid for
// the model, and their cards were already shown on the turn that made them.
export function makeGetAssistantHistory({ conversations }: Dependencies) {
  return async function getAssistantHistory(
    userId: string,
  ): Promise<AssistantHistoryMessage[]> {
    const turns = await conversations.load(userId)
    return turns
      .filter(turn => turn.content.trim().length > 0)
      .map(turn => ({ role: turn.role, text: turn.content }))
  }
}

export function makeClearAssistantHistory({ conversations }: Dependencies) {
  return async function clearAssistantHistory(userId: string): Promise<void> {
    await conversations.clear(userId)
  }
}
