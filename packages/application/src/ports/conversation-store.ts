export type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
}

export interface ConversationStore {
  load(userId: string): Promise<ConversationTurn[]>
  append(userId: string, turns: ConversationTurn[]): Promise<void>
}
