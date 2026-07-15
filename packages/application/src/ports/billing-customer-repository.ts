import type { BillingCustomer, PaymentProvider } from '@lifedeck/domain'

export interface BillingCustomerRepository {
  findByUser(
    provider: PaymentProvider,
    userId: string,
  ): Promise<BillingCustomer | null>
  save(customer: BillingCustomer): Promise<void>
}
