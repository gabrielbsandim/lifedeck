import { checkoutRequestSchema } from '@lifedeck/application'
import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'
import { siteUrl } from '@/lib/site'

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
    const body = checkoutRequestSchema.parse(await request.json())
    const container = getContainer()
    const user = await container.getUser(userId)
    const base = siteUrl()
    const session = await container.startCheckout({
      userId,
      email: user.email ?? null,
      plan: body.plan,
      interval: body.interval,
      market: body.market,
      successUrl: `${base}/settings/billing?status=success`,
      cancelUrl: `${base}/settings/billing?status=cancelled`,
    })
    return ok({ url: session.url })
  } catch (error) {
    return handleError(error)
  }
}
