// What a tool changed in a turn, kept beside the reply so a later turn can name
// "the task I just created" by id instead of searching for it again.
export type RecordedAction = {
  tool: string
  id: string
  title: string
  kind?: string
  date?: string
}

export type ConversationTurn = {
  role: 'user' | 'assistant'
  content: string
  actions?: RecordedAction[]
}

export interface ConversationStore {
  load(userId: string): Promise<ConversationTurn[]>
  append(userId: string, turns: ConversationTurn[]): Promise<void>
  clear(userId: string): Promise<void>
}
