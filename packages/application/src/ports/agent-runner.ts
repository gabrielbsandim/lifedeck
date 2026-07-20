import type { Entitlement } from '@lifedeck/domain'
import type { ConversationTurn } from '@/ports/conversation-store'
import type { MediaPayload } from '@/ports/messaging-channel'

export type AgentModelTier = 'flash' | 'pro'

export type AgentRunInput = {
  userId: string
  // The user's text. Optional when `audio` is provided instead: a voice note
  // the assistant understands directly (multimodally), so it disambiguates with
  // full task/calendar context rather than acting on a lossy transcription.
  message?: string
  audio?: MediaPayload
  history: ConversationTurn[]
  model?: AgentModelTier
  // The plan entitlements granted to this user, so the runner can gate
  // entitlement-scoped tools (e.g. smart scheduling). Omitted means none extra.
  entitlements?: Entitlement[]
}

export type AgentReply = {
  text: string
}

export interface AgentRunner {
  run(input: AgentRunInput): Promise<AgentReply>
}
