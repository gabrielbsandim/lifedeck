import type { CheckoutIntent, PaymentProvider } from '@lifedeck/domain'

export interface CheckoutIntentRepository {
  save(intent: CheckoutIntent): Promise<void>
  findByReference(
    provider: PaymentProvider,
    reference: string,
  ): Promise<CheckoutIntent | null>
}
