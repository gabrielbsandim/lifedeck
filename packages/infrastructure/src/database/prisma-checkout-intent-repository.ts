import {
  CheckoutIntent,
  type PaymentProvider,
  asEntityId,
} from '@lifedeck/domain'
import type { CheckoutIntentRepository } from '@lifedeck/application'
import type { PrismaClient } from '@prisma/client'

function toDomain(record: {
  id: string
  provider: string
  reference: string
  createdAt: Date
}): CheckoutIntent {
  return CheckoutIntent.restore({
    id: asEntityId(record.id),
    provider: record.provider as PaymentProvider,
    reference: record.reference,
    createdAt: record.createdAt,
  })
}

export class PrismaCheckoutIntentRepository
  implements CheckoutIntentRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  async save(intent: CheckoutIntent): Promise<void> {
    const props = intent.toJSON()
    await this.prisma.checkoutIntent.upsert({
      where: { id: props.id as string },
      create: {
        id: props.id as string,
        provider: props.provider,
        reference: props.reference,
        createdAt: props.createdAt,
      },
      update: {},
    })
  }

  async findByReference(
    provider: PaymentProvider,
    reference: string,
  ): Promise<CheckoutIntent | null> {
    const row = await this.prisma.checkoutIntent.findFirst({
      where: { provider, reference },
      orderBy: { createdAt: 'desc' },
    })
    return row ? toDomain(row) : null
  }
}
