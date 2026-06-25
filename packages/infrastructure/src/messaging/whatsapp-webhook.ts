import { createHmac, timingSafeEqual } from 'node:crypto'

export type ParsedWhatsappMessage = { from: string; messageId: string } & (
  | { kind: 'text'; text: string }
  | { kind: 'audio'; mediaId: string }
  | { kind: 'image'; mediaId: string }
)

export function verifyWhatsAppSignature(
  rawBody: string,
  header: string | null,
  appSecret: string,
): boolean {
  if (!appSecret || !header || !header.startsWith('sha256=')) {
    return false
  }
  const provided = header.slice('sha256='.length)
  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(provided)
  return a.length === b.length && timingSafeEqual(a, b)
}

type WhatsappMessage = {
  from?: string
  id?: string
  type?: string
  text?: { body?: string }
  audio?: { id?: string }
  image?: { id?: string }
}

type WhatsappPayload = {
  entry?: Array<{
    changes?: Array<{ value?: { messages?: WhatsappMessage[] } }>
  }>
}

function parseMessage(message: WhatsappMessage): ParsedWhatsappMessage | null {
  const from = message.from
  const messageId = message.id
  if (!from || !messageId) {
    return null
  }
  if (message.type === 'text' && message.text?.body) {
    return { from, messageId, kind: 'text', text: message.text.body }
  }
  if (message.type === 'audio' && message.audio?.id) {
    return { from, messageId, kind: 'audio', mediaId: message.audio.id }
  }
  if (message.type === 'image' && message.image?.id) {
    return { from, messageId, kind: 'image', mediaId: message.image.id }
  }
  return null
}

export function parseInboundMessages(
  payload: unknown,
): ParsedWhatsappMessage[] {
  const typed = payload as WhatsappPayload
  const messages: ParsedWhatsappMessage[] = []
  for (const entry of typed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        const parsed = parseMessage(message)
        if (parsed) {
          messages.push(parsed)
        }
      }
    }
  }
  return messages
}
