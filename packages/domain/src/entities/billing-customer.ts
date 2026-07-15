import { guard } from '@/shared/guard'
import type { EntityId } from '@/shared/id'
import type { PaymentProvider } from '@/value-objects/payment-provider'

// Maps one of our users to the customer record the payment provider (Asaas)
// created for them. Storing this lets us reuse the same provider customer across
// charges instead of creating a duplicate on every checkout. We deliberately do
// NOT store the CPF here: only the opaque provider customer id.
export type BillingCustomerProps = {
  id: EntityId
  userId: EntityId
  provider: PaymentProvider
  customerId: string
  createdAt: Date
}

export class BillingCustomer {
  private constructor(private props: BillingCustomerProps) {}

  static create(input: {
    id: EntityId
    userId: EntityId
    provider: PaymentProvider
    customerId: string
    createdAt: Date
  }): BillingCustomer {
    return new BillingCustomer({
      id: input.id,
      userId: input.userId,
      provider: input.provider,
      customerId: guard.notEmpty(input.customerId, 'Billing customer id'),
      createdAt: input.createdAt,
    })
  }

  static restore(props: BillingCustomerProps): BillingCustomer {
    return new BillingCustomer({ ...props })
  }

  get id(): EntityId {
    return this.props.id
  }

  get userId(): EntityId {
    return this.props.userId
  }

  get provider(): PaymentProvider {
    return this.props.provider
  }

  get customerId(): string {
    return this.props.customerId
  }

  toJSON(): BillingCustomerProps {
    return { ...this.props }
  }
}
