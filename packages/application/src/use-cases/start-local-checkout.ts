import { BillingCustomer, CheckoutIntent, asEntityId } from '@lifedeck/domain'
import type { BillingCustomerRepository } from '@/ports/billing-customer-repository'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { LocalPaymentGateway } from '@/ports/payment-gateway'
import type { UserRepository } from '@/ports/user-repository'
import type {
  LocalCheckoutRequest,
  LocalCheckoutResult,
} from '@/dtos/billing-dto'

type Dependencies = {
  gateway: LocalPaymentGateway
  users: UserRepository
  billingCustomers: BillingCustomerRepository
  checkoutIntents: CheckoutIntentRepository
  ids: IdGenerator
  clock: Clock
}

export type StartLocalCheckoutInput = LocalCheckoutRequest & {
  userId: string
  remoteIp: string
}

/**
 * Create an in-app Asaas subscription (Pix or card) for a BR customer. Reuses
 * the stored Asaas customer when present, otherwise creates one and remembers
 * it. Persists a CheckoutIntent keyed by the subscription reference so the
 * shared webhook can authorize activation once the payment confirms. Returns the
 * Pix QR for the Pix flow, or an acknowledgement for the card flow (which the
 * client confirms by polling the subscription until it goes active).
 */
export function makeStartLocalCheckout({
  gateway,
  users,
  billingCustomers,
  checkoutIntents,
  ids,
  clock,
}: Dependencies) {
  return async function startLocalCheckout(
    input: StartLocalCheckoutInput,
  ): Promise<LocalCheckoutResult> {
    const provider = gateway.provider
    const user = await users.findById(asEntityId(input.userId))
    if (!user) {
      throw new Error('User not found')
    }

    const existing = await billingCustomers.findByUser(provider, input.userId)
    let customerId: string
    if (existing) {
      customerId = existing.customerId
    } else {
      customerId = await gateway.createCustomer({
        name: user.displayName,
        email: user.email,
        cpfCnpj: input.cpfCnpj,
        phone: input.method === 'card' ? (input.phone ?? null) : null,
        postalCode: input.method === 'card' ? input.postalCode : null,
        addressNumber: input.method === 'card' ? input.addressNumber : null,
      })
      await billingCustomers.save(
        BillingCustomer.create({
          id: ids.generate(),
          userId: asEntityId(input.userId),
          provider,
          customerId,
          createdAt: clock.now(),
        }),
      )
    }

    const subscription = {
      customerId,
      userId: input.userId,
      plan: input.plan,
      interval: input.interval,
    }

    const recordIntent = (reference: string) =>
      checkoutIntents.save(
        CheckoutIntent.create({
          id: ids.generate(),
          provider,
          reference,
          createdAt: clock.now(),
        }),
      )

    if (input.method === 'pix') {
      const charge = await gateway.createPixSubscription(subscription)
      await recordIntent(charge.reference)
      return {
        method: 'pix',
        encodedImage: charge.encodedImage,
        payload: charge.payload,
        expiresAt: charge.expiresAt,
      }
    }

    const result = await gateway.createCardSubscription({
      ...subscription,
      card: input.card,
      holder: {
        name: user.displayName,
        email: user.email,
        cpfCnpj: input.cpfCnpj,
        postalCode: input.postalCode,
        addressNumber: input.addressNumber,
        phone: input.phone ?? null,
      },
      remoteIp: input.remoteIp,
    })
    await recordIntent(result.reference)
    return { method: 'card' }
  }
}
