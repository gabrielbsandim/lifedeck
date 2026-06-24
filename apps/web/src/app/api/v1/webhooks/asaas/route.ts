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
    const token = request.headers.get('asaas-access-token')
    const result = await getContainer().handleSubscriptionWebhook(
      'asaas',
      rawBody,
      token,
    )
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}
