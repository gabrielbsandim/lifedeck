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

  update(
    input: {
      plan?: Plan
      status: SubscriptionStatus
      currentPeriodEnd: Date | null
    },
    now: Date,
  ): void {
    if (input.plan !== undefined) {
      this.props.plan = input.plan
    }
    this.props.status = input.status
    this.props.currentPeriodEnd = input.currentPeriodEnd
    this.props.updatedAt = now
  }

  isActive(now: Date): boolean {
    if (this.props.status !== 'active' && this.props.status !== 'trialing') {
      return false
    }
    return (
      this.props.currentPeriodEnd === null || this.props.currentPeriodEnd > now
    )
  }

  toJSON(): SubscriptionProps {
    return { ...this.props }
  }
}
