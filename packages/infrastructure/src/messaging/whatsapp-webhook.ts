import { createHmac, timingSafeEqual } from 'node:crypto'

export type ParsedWhatsappMessage = {
  from: string
  text: string
  messageId: string
}

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

type WhatsappPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string
          id?: string
          type?: string
          text?: { body?: string }
        }>
      }
    }>
  }>
}

export function parseInboundMessages(
  payload: unknown,
): ParsedWhatsappMessage[] {
  const typed = payload as WhatsappPayload
  const messages: ParsedWhatsappMessage[] = []
  for (const entry of typed.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const message of change.value?.messages ?? []) {
        if (message.type !== 'text') {
          continue
        }
        const from = message.from
        const text = message.text?.body
        const messageId = message.id
        if (from && text && messageId) {
          messages.push({ from, text, messageId })
        }
      }
    }
  }
  return messages
}
