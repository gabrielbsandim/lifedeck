import { getContainer } from '@/server/container'
import { fail, handleError, ok } from '@/server/api/respond'
import { requireFeature } from '@/server/api/entitlement-guard'
import { getUserIdFromRequest } from '@/server/session/session'
import {
  pairingDeepLink,
  pairingRequestSchema,
} from '@/server/api/pairing-link'

export async function POST(request: Request) {
  try {
    const gate = requireFeature('whatsapp')
    if (gate) {
      return gate
    }
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return fail('UNAUTHORIZED', 'No active session.', 401)
    }
    const { phone } = pairingRequestSchema.parse(await request.json())
    const result = await getContainer().startWhatsappPairing(userId, phone)
    if (result.status === 'pending') {
      return ok({ ...result, deepLink: pairingDeepLink(result.code) })
    }
    return ok(result)
  } catch (error) {
    return handleError(error)
  }
}
