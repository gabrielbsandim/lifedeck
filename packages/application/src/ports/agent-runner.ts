import type { ConversationTurn } from '@/ports/conversation-store'

export type AgentModelTier = 'flash' | 'pro'

export type AgentRunInput = {
  userId: string
  message: string
  history: ConversationTurn[]
  model?: AgentModelTier
}

export type AgentReply = {
  text: string
}

export interface AgentRunner {
  run(input: AgentRunInput): Promise<AgentReply>
}
