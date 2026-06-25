import type {
  ConversationStore,
  ConversationTurn,
} from '@/ports/conversation-store'

export class InMemoryConversationStore implements ConversationStore {
  private readonly turns = new Map<string, ConversationTurn[]>()

  async load(userId: string): Promise<ConversationTurn[]> {
    return [...(this.turns.get(userId) ?? [])]
  }

  async append(userId: string, turns: ConversationTurn[]): Promise<void> {
    const existing = this.turns.get(userId) ?? []
    this.turns.set(userId, [...existing, ...turns])
  }

  async clear(userId: string): Promise<void> {
    this.turns.delete(userId)
  }
}
