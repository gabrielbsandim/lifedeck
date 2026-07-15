import type { BillingCustomer, PaymentProvider } from '@lifedeck/domain'
import type { BillingCustomerRepository } from '@/ports/billing-customer-repository'

export class InMemoryBillingCustomerRepository
  implements BillingCustomerRepository
{
  private readonly items = new Map<string, BillingCustomer>()

  private key(provider: PaymentProvider, userId: string): string {
    return `${provider}:${userId}`
  }

  async findByUser(
    provider: PaymentProvider,
    userId: string,
  ): Promise<BillingCustomer | null> {
    return this.items.get(this.key(provider, userId)) ?? null
  }

  async save(customer: BillingCustomer): Promise<void> {
    this.items.set(
      this.key(customer.provider, customer.userId as string),
      customer,
    )
  }
}
