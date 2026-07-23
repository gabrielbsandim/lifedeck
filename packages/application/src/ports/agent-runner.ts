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

// A card-worthy action the assistant took this turn: a tool it ran that the
// client renders as an inline "receipt" card (task added, event scheduled, list
// created, the day's overview, weather, a free slot). The client maps it by
// `tool` name, reading display data from `input` (the arguments the model
// passed, e.g. a task title or event time — mutation results only carry an id)
// and richer payloads from `result` (the tool's return value, e.g. the day's
// tasks or a weather lookup). Non-card tools (lookups, deletes) are omitted. The
// WhatsApp channel ignores this; only the in-app chat renders it.
export type AgentAction = {
  tool: string
  input: unknown
  result: unknown
}

export type AgentReply = {
  text: string
  actions?: AgentAction[]
}

export interface AgentRunner {
  run(input: AgentRunInput): Promise<AgentReply>
}
