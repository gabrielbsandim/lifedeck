import { localCheckoutRequestSchema } from '@lifedeck/application'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip')
  return ip || '0.0.0.0'
}

export async function POST(request: Request) {
  try {
    const gate = requireFeature('billing')
    if (gate) {
      return gate
    }
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const body = localCheckoutRequestSchema.parse(await request.json())
    const result = await getContainer().startLocalCheckout({
      ...body,
      userId,
      remoteIp: clientIp(request),
    })
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}
