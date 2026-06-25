import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { PaymentProvider } from '@/value-objects/payment-provider'

export type CheckoutIntentProps = {
  id: EntityId
  provider: PaymentProvider
  reference: string
  createdAt: Date
}

export class CheckoutIntent {
  private constructor(private props: CheckoutIntentProps) {}

  static create(input: {
    id: EntityId
    provider: PaymentProvider
    reference: string
    createdAt: Date
  }): CheckoutIntent {
    return new CheckoutIntent({
      id: input.id,
      provider: input.provider,
      reference: guard.notEmpty(input.reference, 'Checkout reference'),
      createdAt: input.createdAt,
    })
  }

  static restore(props: CheckoutIntentProps): CheckoutIntent {
    return new CheckoutIntent({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get provider(): PaymentProvider {
    return this.props.provider
  }

  get reference(): string {
    return this.props.reference
  }

  toJSON(): CheckoutIntentProps {
    return { ...this.props }
  }
}
