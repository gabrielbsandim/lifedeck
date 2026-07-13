import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { Plan } from '@/value-objects/plan'
import type { PaymentProvider } from '@/value-objects/payment-provider'
import type { SubscriptionStatus } from '@/value-objects/subscription-status'

export type SubscriptionProps = {
  id: EntityId
  userId: EntityId
  plan: Plan
  status: SubscriptionStatus
  provider: PaymentProvider
  providerRef: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}

export class Subscription {
  private constructor(private props: SubscriptionProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    plan: Plan
    status: SubscriptionStatus
    provider: PaymentProvider
    providerRef: string
    currentPeriodEnd: Date | null
    cancelAtPeriodEnd?: boolean
    now: Date
  }): Subscription {
    return new Subscription({
      id: input.id,
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      provider: input.provider,
      providerRef: guard.notEmpty(
        input.providerRef,
        'Subscription provider reference',
      ),
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  static restore(props: SubscriptionProps): Subscription {
    return new Subscription({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get plan(): Plan {
    return this.props.plan
  }

  get status(): SubscriptionStatus {
    return this.props.status
  }

  get provider(): PaymentProvider {
    return this.props.provider
  }

  get providerRef(): string {
    return this.props.providerRef
  }

  get currentPeriodEnd(): Date | null {
    return this.props.currentPeriodEnd
  }

  get cancelAtPeriodEnd(): boolean {
    return this.props.cancelAtPeriodEnd
  }

  update(
    input: {
      plan?: Plan
      status: SubscriptionStatus
      currentPeriodEnd: Date | null
      cancelAtPeriodEnd?: boolean
    },
    now: Date,
  ): void {
    if (input.plan !== undefined) {
      this.props.plan = input.plan
    }
    this.props.status = input.status
    this.props.currentPeriodEnd = input.currentPeriodEnd
    if (input.cancelAtPeriodEnd !== undefined) {
      this.props.cancelAtPeriodEnd = input.cancelAtPeriodEnd
    }
    this.props.updatedAt = now
  }

  // The user asked to cancel; the plan stays active until the period ends, when
  // the provider webhook flips the status to canceled.
  requestCancellation(now: Date): void {
    this.props.cancelAtPeriodEnd = true
    this.props.updatedAt = now
  }

  isActive(now: Date): boolean {
    if (this.props.status === 'active' || this.props.status === 'trialing') {
      return (
        this.props.currentPeriodEnd === null ||
        this.props.currentPeriodEnd > now
      )
    }
    // A user-scheduled cancellation keeps access through the period already paid
    // for, even after the provider flips the status to canceled. Asaas deletes
    // the subscription immediately, so without this the customer would lose a
    // period they already paid for; Stripe waits, but both are honored here.
    if (this.props.status === 'canceled' && this.props.cancelAtPeriodEnd) {
      return (
        this.props.currentPeriodEnd !== null &&
        this.props.currentPeriodEnd > now
      )
    }
    // A failed renewal charge does not immediately revoke access. Providers
    // (Stripe Smart Retries, Asaas overdue) keep retrying the card for days
    // while reporting past_due, so the customer keeps their plan through the
    // period they already paid for and is only downgraded once it lapses.
    if (this.props.status === 'past_due') {
      return (
        this.props.currentPeriodEnd !== null &&
        this.props.currentPeriodEnd > now
      )
    }
    return false
  }

  toJSON(): SubscriptionProps {
    return { ...this.props }
  }
}
