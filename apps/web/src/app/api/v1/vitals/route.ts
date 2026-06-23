import { handleError, ok } from '@/server/api/respond'
import { log } from '@/server/api/logger'

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: unknown
      value?: unknown
      rating?: unknown
      id?: unknown
    } | null
    if (body && typeof body.name === 'string') {
      log('info', 'web-vital', {
        name: body.name,
        value: typeof body.value === 'number' ? body.value : null,
        rating: typeof body.rating === 'string' ? body.rating : null,
        id: typeof body.id === 'string' ? body.id : null,
      })
    }
    return ok({ received: true })
  } catch (error) {
    return handleError(error)
  }
}
