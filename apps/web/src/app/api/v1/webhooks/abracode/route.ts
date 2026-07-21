import { after, NextResponse } from 'next/server'
import {
  parseAbracodeInbound,
  verifyWhatsAppSignature,
} from '@lifedeck/infrastructure'
import { getContainer } from '@/server/container'
import { handleError } from '@/server/api/respond'
import { isFeatureEnabled } from '@/server/api/features'
import { log } from '@/server/api/logger'
import { checkWhatsappRateLimit } from '@/server/api/rate-limit'
import {
  isRedisConfigured,
  markMessageProcessed,
  releaseMessageClaim,
} from '@/server/api/whatsapp-dedup'

// Inbound webhook when WhatsApp is routed through the Abracode gateway. Abracode
// registers this endpoint via its API (no hub.challenge handshake), POSTs a
// normalized `{ type, data }` body, and signs it with `X-Abracode-Signature`
// (HMAC-SHA256 over the raw body with the endpoint secret). Downstream handling
// is identical to the Meta-direct route: dedup, per-sender throttle, then hand
// the message to the provider-agnostic assistant.
// The inbound handler runs the assistant in after() once the 200 is acked, so
// give it room; a truncated turn would drop the user's reply silently.
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    if (!isFeatureEnabled('whatsapp')) {
      return new NextResponse(null, { status: 404 })
    }
    const secret = process.env.ABRACODE_WEBHOOK_SECRET ?? ''
    const rawBody = await request.text()
    const signature = request.headers.get('x-abracode-signature')
    if (!verifyWhatsAppSignature(rawBody, signature, secret)) {
      return new NextResponse(null, { status: 401 })
    }
    if (!isRedisConfigured()) {
      log('error', 'abracode inbound skipped: Upstash is not configured')
      return new NextResponse(null, { status: 200 })
    }

    const messages = parseAbracodeInbound(JSON.parse(rawBody))
    const container = getContainer()

    after(async () => {
      for (const message of messages) {
        let claimed = false
        try {
          if (!(await markMessageProcessed(message.messageId))) {
            continue
          }
          claimed = true
          const allowed = await checkWhatsappRateLimit(
            `whatsapp:${message.from}`,
          )
          if (!allowed.ok) {
            continue
          }
          await container.handleInboundWhatsApp(
            message.kind === 'text'
              ? { from: message.from, kind: 'text', text: message.text }
              : message.kind === 'button'
                ? {
                    from: message.from,
                    kind: 'button',
                    buttonId: message.buttonId,
                    text: message.text,
                  }
                : {
                    from: message.from,
                    kind: message.kind,
                    mediaId: message.mediaId,
                  },
          )
        } catch (error) {
          if (claimed) {
            await releaseMessageClaim(message.messageId)
          }
          log('error', 'abracode inbound failed', { error: String(error) })
        }
      }
    })

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return handleError(error)
  }
}
