import { getContainer } from '@/server/container'
import { handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'

export async function POST(request: Request) {
  try {
    const gate = requireFeature('billing')
    if (gate) {
      return gate
    }
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')
    const result = await getContainer().handleSubscriptionWebhook(
      'stripe',
      rawBody,
      signature,
    )
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}
