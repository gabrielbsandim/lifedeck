import {
  Subscription,
  asEntityId,
  type PaymentProvider,
  type Plan,
  type SubscriptionStatus,
} from '@lifedeck/domain'

export type SubscriptionRecord = {
  id: string
  userId: string
  plan: Plan
  status: SubscriptionStatus
  provider: PaymentProvider
  providerRef: string
  currentPeriodEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

export function toDomainSubscription(record: SubscriptionRecord): Subscription {
  return Subscription.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    plan: record.plan,
    status: record.status,
    provider: record.provider,
    providerRef: record.providerRef,
    currentPeriodEnd: record.currentPeriodEnd,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}

export function toSubscriptionRecord(
  subscription: Subscription,
): SubscriptionRecord {
  const props = subscription.toJSON()
  return {
    id: props.id,
    userId: props.userId,
    plan: props.plan,
    status: props.status,
    provider: props.provider,
    providerRef: props.providerRef,
    currentPeriodEnd: props.currentPeriodEnd,
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  }
}
