import {
  BillingCustomer,
  CheckoutIntent,
  Subscription,
  asEntityId,
  trialDaysFor,
} from '@lifedeck/domain'
import type { BillingCustomerRepository } from '@/ports/billing-customer-repository'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type {
  LocalPaymentGateway,
  SubscriptionHandle,
} from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'
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
  subscriptions: SubscriptionRepository
  ids: IdGenerator
  clock: Clock
}

const DAY_MS = 24 * 60 * 60_000

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
 *
 * A first time Pro subscriber starts a trial instead: the subscription is
 * stored as trialing right away, because no payment webhook arrives until the
 * first charge falls due at the end of the trial.
 */
export function makeStartLocalCheckout({
  gateway,
  users,
  billingCustomers,
  checkoutIntents,
  subscriptions,
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

    const history = await subscriptions.listByUser(asEntityId(input.userId))
    const trialDays = trialDaysFor(input.plan, history.length > 0)
    const subscription = {
      customerId,
      userId: input.userId,
      plan: input.plan,
      interval: input.interval,
      trialDays,
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

    const startTrial = async (
      handle: SubscriptionHandle,
    ): Promise<LocalCheckoutResult> => {
      await recordIntent(handle.reference)
      const now = clock.now()
      const endsAt = new Date(now.getTime() + trialDays * DAY_MS)
      await subscriptions.save(
        Subscription.create({
          id: ids.generate(),
          userId: asEntityId(input.userId),
          plan: input.plan,
          status: 'trialing',
          provider,
          providerRef: handle.subscriptionRef,
          currentPeriodEnd: endsAt,
          now,
        }),
      )
      return { method: 'trial', endsAt: endsAt.toISOString() }
    }

    if (input.method === 'pix' && trialDays > 0) {
      return startTrial(await gateway.createPixTrialSubscription(subscription))
    }

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
    if (trialDays > 0) {
      return startTrial(result)
    }
    await recordIntent(result.reference)
    return { method: 'card' }
  }
}
