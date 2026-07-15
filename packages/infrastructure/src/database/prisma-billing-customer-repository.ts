import {
  BillingCustomer,
  asEntityId,
  type PaymentProvider,
} from '@lifedeck/domain'
import type { BillingCustomerRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

function toDomain(record: {
  id: string
  userId: string
  provider: string
  customerId: string
  createdAt: Date
}): BillingCustomer {
  return BillingCustomer.restore({
    id: asEntityId(record.id),
    userId: asEntityId(record.userId),
    provider: record.provider as PaymentProvider,
    customerId: record.customerId,
    createdAt: record.createdAt,
  })
}

export class PrismaBillingCustomerRepository
  implements BillingCustomerRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async findByUser(
    provider: PaymentProvider,
    userId: string,
  ): Promise<BillingCustomer | null> {
    const row = await this.prisma.billingCustomer.findUnique({
      where: { provider_userId: { provider, userId } },
    })
    return row ? toDomain(row) : null
  }

  async save(customer: BillingCustomer): Promise<void> {
    const props = customer.toJSON()
    await this.prisma.billingCustomer.upsert({
      where: {
        provider_userId: {
          provider: props.provider,
          userId: props.userId as string,
        },
      },
      create: {
        id: props.id as string,
        userId: props.userId as string,
        provider: props.provider,
        customerId: props.customerId,
        createdAt: props.createdAt,
      },
      update: { customerId: props.customerId },
    })
  }
}
