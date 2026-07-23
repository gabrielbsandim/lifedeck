import { z } from 'zod'
import type { InAppMessage } from '@lifedeck/application'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { getUserIdFromRequest } from '@/server/session/session'
import {
  checkAssistantRateLimit,
  rateLimitHeaders,
} from '@/server/api/rate-limit'

// The in-app assistant chat: one turn in (text, a photo, or a voice note), the
// assistant's reply plus any action cards out. Text comes as JSON; media comes
// as multipart/form-data so the raw bytes stream straight through to the same
// agent the WhatsApp assistant uses.
const textSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  locale: z.enum(['en', 'pt', 'es']).optional(),
})

const LOCALES = new Set(['en', 'pt', 'es'])
// A voice note or photo is small; anything larger is a mistake or abuse, and
// the model would reject it anyway. Refuse before buffering the whole upload.
const MAX_MEDIA_BYTES = 12 * 1024 * 1024

function parseLocale(value: unknown): 'en' | 'pt' | 'es' | undefined {
  return typeof value === 'string' && LOCALES.has(value)
    ? (value as 'en' | 'pt' | 'es')
    : undefined
}

async function toMessage(
  userId: string,
  request: Request,
): Promise<InAppMessage> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    const { text, locale } = textSchema.parse(await request.json())
    return { userId, kind: 'text', text, locale }
  }

  const form = await request.formData()
  const locale = parseLocale(form.get('locale'))
  const image = form.get('image')
  const audio = form.get('audio')
  const file =
    image instanceof File && image.size > 0
      ? { kind: 'image' as const, file: image }
      : audio instanceof File && audio.size > 0
        ? { kind: 'audio' as const, file: audio }
        : null

  if (file) {
    if (file.file.size > MAX_MEDIA_BYTES) {
      throw new z.ZodError([
        {
          code: 'too_big',
          maximum: MAX_MEDIA_BYTES,
          type: 'array',
          inclusive: true,
          path: [file.kind],
          message: 'File is too large.',
        },
      ])
    }
    const payload = {
      data: await file.file.arrayBuffer(),
      mimeType: file.file.type || 'application/octet-stream',
    }
    return file.kind === 'image'
      ? { userId, kind: 'image', image: payload, locale }
      : { userId, kind: 'audio', audio: payload, locale }
  }

  const text = form.get('text')
  return textSchema
    .pick({ text: true })
    .transform(({ text: value }) => ({
      userId,
      kind: 'text' as const,
      text: value,
      locale,
    }))
    .parse({ text })
}

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
    const message = await toMessage(userId, request)
    const container = getContainer()
    const result = await container.handleInAppMessage(message)
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
