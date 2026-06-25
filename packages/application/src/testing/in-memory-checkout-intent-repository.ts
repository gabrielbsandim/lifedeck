import type { CheckoutIntent, PaymentProvider } from '@lifedeck/domain'
import type { CheckoutIntentRepository } from '@/ports/checkout-intent-repository'

export class InMemoryCheckoutIntentRepository
  implements CheckoutIntentRepository
{
  private readonly items = new Map<string, CheckoutIntent>()

  async save(intent: CheckoutIntent): Promise<void> {
    this.items.set(intent.id as string, intent)
  }

  async findByReference(
    provider: PaymentProvider,
    reference: string,
  ): Promise<CheckoutIntent | null> {
    return (
      [...this.items.values()].find(
        item => item.provider === provider && item.reference === reference,
      ) ?? null
    )
  }
}
