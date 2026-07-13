import {
  Subscription,
  asEntityId,
  type PaymentProvider,
} from '@lifedeck/domain'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'
import type { Clock } from '@/ports/clock'
import type { IdGenerator } from '@/ports/id-generator'
import type { PaymentGateway } from '@/ports/payment-gateway'
import type { SubscriptionRepository } from '@/ports/subscription-repository'

type Dependencies = {
  gateways: Record<PaymentProvider, PaymentGateway>
  subscriptions: SubscriptionRepository
  checkoutIntents: CheckoutIntentRepository
  ids: IdGenerator
  clock: Clock
}

export function makeHandleSubscriptionWebhook({
  gateways,
  subscriptions,
  checkoutIntents,
  ids,
  clock,
}: Dependencies) {
  return async function handleSubscriptionWebhook(
    provider: PaymentProvider,
    rawBody: string,
    signature: string | null,
  ): Promise<{ handled: boolean }> {
    const event = await gateways[provider].parseWebhook(rawBody, signature)
    if (!event) {
      return { handled: false }
    }

    const existing = await subscriptions.findByProviderRef(
      provider,
      event.providerRef,
    )
    if (existing) {
      // A still-active event that does not carry a period end (Stripe's
      // checkout.session.completed) must not wipe a real renewal date that a
      // subscription.* event already recorded, since providers do not
      // guarantee event ordering.
      const keepsAccess =
        event.status === 'active' || event.status === 'trialing'
      // A user-scheduled cancellation keeps the paid-through date so access
      // survives to the period end, even when the provider (Asaas) deletes the
      // subscription immediately and reports no period end. An involuntary
      // cancellation (refund, chargeback) has no such flag and revokes at once.
      const scheduledCancel =
        event.status === 'canceled' && existing.cancelAtPeriodEnd
      let nextPeriodEnd =
        event.currentPeriodEnd ??
        (keepsAccess || scheduledCancel ? existing.currentPeriodEnd : null)

      // Providers do not guarantee ordering and retry failed deliveries, so a
      // stale (older) event can arrive after a newer one. A still-active event
      // must never SHORTEN a period end already recorded, which would cut paid
      // access short. Only let the renewal date move forward.
      if (
        keepsAccess &&
        nextPeriodEnd &&
        existing.currentPeriodEnd &&
        nextPeriodEnd < existing.currentPeriodEnd
      ) {
        nextPeriodEnd = existing.currentPeriodEnd
      }

      // Once a cancellation is scheduled, only a genuine reactivation (an event
      // whose period end is strictly later than what we already stored) may
      // clear the flag. A replayed pre-cancel event carrying the same period
      // end must not silently re-enable billing on a customer who asked to stop.
      let nextCancelAtPeriodEnd = event.cancelAtPeriodEnd
      if (
        existing.cancelAtPeriodEnd &&
        event.cancelAtPeriodEnd === false &&
        !(
          event.currentPeriodEnd &&
          existing.currentPeriodEnd &&
          event.currentPeriodEnd > existing.currentPeriodEnd
        )
      ) {
        nextCancelAtPeriodEnd = undefined
      }

      existing.update(
        {
          plan: event.plan ?? undefined,
          status: event.status,
          currentPeriodEnd: nextPeriodEnd,
          cancelAtPeriodEnd: nextCancelAtPeriodEnd,
        },
        clock.now(),
      )
      await subscriptions.save(existing)
      return { handled: true }
    }

    if (!event.userId || !event.plan) {
      return { handled: false }
    }

    if (event.reference) {
      const intent = await checkoutIntents.findByReference(
        provider,
        event.reference,
      )
      if (!intent) {
        return { handled: false }
      }
    }

    const created = Subscription.create({
      id: ids.generate(),
      userId: asEntityId(event.userId),
      plan: event.plan,
      status: event.status,
      provider,
      providerRef: event.providerRef,
      currentPeriodEnd: event.currentPeriodEnd,
      cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      now: clock.now(),
    })
    await subscriptions.save(created)
    return { handled: true }
  }
}
