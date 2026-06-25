import { NextResponse } from 'next/server'
import {
  parseInboundMessages,
  verifyWhatsAppSignature,
} from '@lifedeck/infrastructure'
import { getContainer } from '@/server/container'
import { handleError } from '@/server/api/respond'
import { isFeatureEnabled } from '@/server/api/features'
import { log } from '@/server/api/logger'
import { checkWhatsappRateLimit } from '@/server/api/rate-limit'
import { markMessageProcessed } from '@/server/api/whatsapp-dedup'

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
    const messages = parseInboundMessages(JSON.parse(rawBody))
    const container = getContainer()
    // Always ack 200 to Meta. Each message is processed in isolation so a single
    // failure never triggers a batch-wide retry. Dedup on the Meta message id
    // makes a retry a no-op, and a per-sender rate limit throttles pairing-code
    // guessing and spam; both gracefully no-op without Upstash.
    for (const message of messages) {
      try {
        if (!(await markMessageProcessed(message.messageId))) {
          continue
        }
        const allowed = await checkWhatsappRateLimit(`whatsapp:${message.from}`)
        if (!allowed.ok) {
          continue
        }
        await container.handleInboundWhatsApp(
          message.kind === 'text'
            ? { from: message.from, kind: 'text', text: message.text }
            : {
                from: message.from,
                kind: message.kind,
                mediaId: message.mediaId,
              },
        )
      } catch (error) {
        log('error', 'whatsapp inbound failed', { error: String(error) })
      }
    }
    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return handleError(error)
  }
}
