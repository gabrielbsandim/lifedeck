// Ported from apps/web/src/lib/api/use-assistant.ts. The refresh map and the
// reply shape are identical; only the outbound media differs — the browser has
// a Blob, the app has a local file URI, which RN's FormData uploads natively.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '@/lib/api/client'
import { userListsKey } from '@/lib/api/use-lists'
import { habitsKey } from '@/lib/api/use-habits'

// A card-worthy action the assistant took, mirrored from the application layer's
// AgentAction. `input` holds the arguments the model passed (a task title, an
// event time) and `result` the tool's return value (the day's tasks, a weather
// lookup); the chat maps each by `tool` name.
export type AssistantAction = {
  tool: string
  input: unknown
  result: unknown
}

export type AssistantReply = {
  text: string
  actions: AssistantAction[]
}

// Tools whose action changes data another screen shows, so a successful turn
// refreshes those queries. Keyed by tool name; a tool absent here needs no
// refresh (weather, find-time are read-only).
const REFRESH_KEYS: Record<string, readonly (readonly unknown[])[]> = {
  addTask: [['daily-board']],
  moveTaskToToday: [['daily-board']],
  createList: [userListsKey],
  addHabit: [habitsKey],
  addEvent: [['calendar-events'], ['daily-board']],
}

// A local file the app attaches to a turn. RN's FormData accepts this shape and
// streams the file straight from disk, so a photo or a voice note never has to
// be materialized in the JS heap.
export type AssistantFile = {
  uri: string
  name: string
  mimeType: string
}

// One outbound turn: text, a photo, or a voice note (never more than one). Text
// goes as JSON; media goes as multipart so the raw bytes reach the same agent.
export type AssistantSendInput = {
  text?: string
  image?: AssistantFile
  audio?: AssistantFile
  locale?: string
}

function appendFile(
  form: FormData,
  field: 'image' | 'audio',
  file: AssistantFile,
): void {
  form.append(field, {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob)
}

function sendMessage(input: AssistantSendInput): Promise<AssistantReply> {
  if (input.image || input.audio) {
    const form = new FormData()
    if (input.locale) {
      form.append('locale', input.locale)
    }
    if (input.text) {
      form.append('text', input.text)
    }
    if (input.image) {
      appendFile(form, 'image', input.image)
    }
    if (input.audio) {
      appendFile(form, 'audio', input.audio)
    }
    return apiRequest<AssistantReply>('/api/v1/assistant/chat', {
      method: 'POST',
      body: form,
    })
  }
  return apiRequest<AssistantReply>('/api/v1/assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ text: input.text, locale: input.locale }),
  })
}

export function useSendAssistantMessage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: sendMessage,
    onSuccess: (reply: AssistantReply) => {
      // Refresh only the screens the assistant's actions actually touched, so a
      // task it added shows up on Today without a manual reload.
      const seen = new Set<string>()
      for (const action of reply.actions) {
        for (const key of REFRESH_KEYS[action.tool] ?? []) {
          const marker = JSON.stringify(key)
          if (seen.has(marker)) {
            continue
          }
          seen.add(marker)
          void queryClient.invalidateQueries({ queryKey: key })
        }
      }
    },
  })
}
