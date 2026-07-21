import { after, NextResponse } from 'next/server'
import {
  parseInboundMessages,
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

// The inbound handler runs the assistant (media transcription + tool steps) in
// after() once the 200 is acked, so give it room; a truncated turn would drop
// the user's reply silently (Meta already got its 200 and will not retry).
export const maxDuration = 60

export async function GET(request: Request) {
  if (!isFeatureEnabled('whatsapp')) {
    return new NextResponse(null, { status: 404 })
  }
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN
  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return new NextResponse(null, { status: 403 })
}

export async function POST(request: Request) {
  try {
    if (!isFeatureEnabled('whatsapp')) {
      return new NextResponse(null, { status: 404 })
    }
    const appSecret = process.env.WHATSAPP_APP_SECRET ?? ''
    const rawBody = await request.text()
    const signature = request.headers.get('x-hub-signature-256')
    if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      return new NextResponse(null, { status: 401 })
    }
    // Fail closed: dedup, the per-sender throttle, and the AI credit meter all
    // ride on Upstash. Without it we cannot cap pairing-code guessing or AI
    // spend, so ack Meta (avoid retries) but refuse to process.
    if (!isRedisConfigured()) {
      log('error', 'whatsapp inbound skipped: Upstash is not configured')
      return new NextResponse(null, { status: 200 })
    }

    const messages = parseInboundMessages(JSON.parse(rawBody))
    const container = getContainer()

    // Ack 200 first, then process off the request. A slow agent turn (media
    // transcription + up to 5 tool steps) must never blow the function budget
    // and return non-200, which would trigger a Meta retry storm.
    after(async () => {
      for (const message of messages) {
        // Claim-then-confirm: claim the id so concurrent retries dedupe, but
        // release the claim if handling fails so a retry can re-attempt instead
        // of the reply being dropped forever.
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
          log('error', 'whatsapp inbound failed', { error: String(error) })
        }
      }
    })

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return handleError(error)
  }
}
