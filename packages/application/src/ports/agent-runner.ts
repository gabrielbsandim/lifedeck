import type { ConversationTurn } from '@/ports/conversation-store'

export type AgentRunInput = {
  userId: string
  message: string
  history: ConversationTurn[]
}

export type AgentReply = {
  text: string
}

export interface AgentRunner {
  run(input: AgentRunInput): Promise<AgentReply>
}
