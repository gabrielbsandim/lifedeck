import type { ParsedWhatsappMessage } from '@/messaging/whatsapp-webhook'

// Abracode delivers a normalized envelope `{ type, data }` and signs the raw body
// with `X-Abracode-Signature: sha256=<hex HMAC-SHA256>`. The HMAC algorithm is
// identical to Meta's, so the route reuses `verifyWhatsAppSignature` with the
// Abracode webhook secret; only this inbound-message parser is provider-specific.

type AbracodeInboundData = {
  from?: string
  messageId?: string
  messageType?: string
  text?: string | null
  media?: { id?: string } | null
}

type AbracodeWebhookBody = {
  type?: string
  data?: AbracodeInboundData
}

export function parseAbracodeInbound(
  payload: unknown,
): ParsedWhatsappMessage[] {
  const body = payload as AbracodeWebhookBody
  if (body.type !== 'message.received' || !body.data) {
    return []
  }
  const { from, messageId, messageType, text, media } = body.data
  if (!from || !messageId) {
    return []
  }
  if (messageType === 'text' && text) {
    return [{ from, messageId, kind: 'text', text }]
  }
  if (messageType === 'audio' && media?.id) {
    return [{ from, messageId, kind: 'audio', mediaId: media.id }]
  }
  if (messageType === 'image' && media?.id) {
    return [{ from, messageId, kind: 'image', mediaId: media.id }]
  }
  return []
}
