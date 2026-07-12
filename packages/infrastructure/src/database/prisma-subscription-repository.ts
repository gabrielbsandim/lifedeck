import type {
  EntityId,
  PaymentProvider,
  Plan,
  Subscription,
  SubscriptionStatus,
} from '@lifedeck/domain'
import type { SubscriptionRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'
import {
  toDomainSubscription,
  toSubscriptionRecord,
  type SubscriptionRecord,
} from '@/database/subscription-record'

function fromPrisma(record: {
  id: string
  userId: string
  plan: string
  status: string
  provider: string
  providerRef: string
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  createdAt: Date
  updatedAt: Date
}): SubscriptionRecord {
  return {
    id: record.id,
    userId: record.userId,
    plan: record.plan as Plan,
    status: record.status as SubscriptionStatus,
    provider: record.provider as PaymentProvider,
    providerRef: record.providerRef,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export class PrismaSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(subscription: Subscription): Promise<void> {
    const record = toSubscriptionRecord(subscription)
    await this.prisma.subscription.upsert({
      where: { id: record.id },
      create: {
        id: record.id,
        userId: record.userId,
        plan: record.plan,
        status: record.status,
        provider: record.provider,
        providerRef: record.providerRef,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
      update: {
        plan: record.plan,
        status: record.status,
        currentPeriodEnd: record.currentPeriodEnd,
        cancelAtPeriodEnd: record.cancelAtPeriodEnd,
        updatedAt: record.updatedAt,
      },
    })
  }

  async findByUser(userId: EntityId): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { userId: userId as string },
      orderBy: { createdAt: 'desc' },
    })
    return row ? toDomainSubscription(fromPrisma(row)) : null
  }

  async listByUser(userId: EntityId): Promise<Subscription[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: 'desc' },
    })
    return rows.map(row => toDomainSubscription(fromPrisma(row)))
  }

  async findByProviderRef(
    provider: PaymentProvider,
    providerRef: string,
  ): Promise<Subscription | null> {
    const row = await this.prisma.subscription.findUnique({
      where: { provider_providerRef: { provider, providerRef } },
    })
    return row ? toDomainSubscription(fromPrisma(row)) : null
  }
}
