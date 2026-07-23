import { z } from 'zod'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import {
  checkAssistantRateLimit,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

// The in-app assistant chat: one text turn in, the assistant's reply plus any
// action cards out. Media (voice/image) is a later slice; the web chat is text
// first, mirroring how the WhatsApp assistant is driven.
const bodySchema = z.object({
  text: z.string().trim().min(1).max(4000),
  locale: z.enum(['en', 'pt', 'es']).optional(),
})

export async function POST(request: Request) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'Authentication required.', 401)
    }
    const rate = await checkAssistantRateLimit(`assistant:${userId}`)
    if (!rate.ok) {
      return fail('RATE_LIMITED', 'Too many requests.', 429, undefined, {
        headers: rateLimitHeaders(rate),
      })
    }
    const { text, locale } = bodySchema.parse(await request.json())
    const container = getContainer()
    const result = await container.handleInAppMessage({
      userId,
      kind: 'text',
      text,
      locale,
    })
    switch (result.status) {
      case 'reply':
        return ok({ text: result.text, actions: result.actions })
      case 'denied':
        return fail(
          'ASSISTANT_LOCKED',
          'The assistant is part of a paid plan.',
          403,
        )
      case 'quota':
        return fail('QUOTA_EXCEEDED', 'Usage limit reached for now.', 429)
      case 'busy':
        return fail('ASSISTANT_BUSY', 'Too many messages right now.', 429)
      case 'unconfigured':
        return fail(
          'ASSISTANT_UNAVAILABLE',
          'That kind of message is not supported yet.',
          422,
        )
      default:
        return fail('INTERNAL_ERROR', 'Something went wrong.', 500)
    }
  } catch (error) {
    return handleError(error)
  }
}
