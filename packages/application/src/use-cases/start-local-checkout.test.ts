import { describe, expect, it, vi } from 'vitest'
import { BillingCustomer, User, asEntityId } from '@lifedeck/domain'
import { makeStartLocalCheckout } from '@/use-cases/start-local-checkout'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryBillingCustomerRepository } from '@/testing/in-memory-billing-customer-repository'
import { InMemoryCheckoutIntentRepository } from '@/testing/in-memory-checkout-intent-repository'
import type { LocalPaymentGateway } from '@/ports/payment-gateway'

const USER_ID = '11111111-1111-4111-8111-111111111111'
const GHOST_ID = '99999999-9999-4999-8999-999999999999'
const ids = {
  generate: () => asEntityId('44444444-4444-4444-8444-444444444444'),
}
const clock = { now: () => new Date('2026-06-24T10:00:00.000Z') }

function fakeGateway(
  overrides: Partial<LocalPaymentGateway> = {},
): LocalPaymentGateway {
  return {
    provider: 'asaas',
    startCheckout: vi.fn(),
    parseWebhook: vi.fn().mockResolvedValue(null),
    cancelSubscription: vi.fn(),
    createCustomer: vi.fn().mockResolvedValue('cus_new'),
    createPixSubscription: vi.fn().mockResolvedValue({
      subscriptionRef: 'sub_pix',
      paymentId: 'pay_1',
      encodedImage: 'BASE64PNG',
      payload: 'pix-copy-paste',
      expiresAt: '2026-06-25T10:00:00Z',
      reference: 'u1|pro|monthly',
    }),
    createCardSubscription: vi.fn().mockResolvedValue({
      subscriptionRef: 'sub_card',
      reference: 'u1|pro|annual',
    }),
    ...overrides,
  }
}

async function setup(gateway: LocalPaymentGateway) {
  const users = new InMemoryUserRepository()
  await users.save(
    User.createGuest({
      id: asEntityId(USER_ID),
      displayName: 'Gabriel',
      locale: 'pt',
      createdAt: new Date('2026-06-01T00:00:00Z'),
    }),
  )
  const billingCustomers = new InMemoryBillingCustomerRepository()
  const checkoutIntents = new InMemoryCheckoutIntentRepository()
  const start = makeStartLocalCheckout({
    gateway,
    users,
    billingCustomers,
    checkoutIntents,
    ids,
    clock,
  })
  return { start, billingCustomers, checkoutIntents }
}

const pixInput = {
  method: 'pix' as const,
  plan: 'pro' as const,
  interval: 'monthly' as const,
  cpfCnpj: '11144477735',
  userId: USER_ID,
  remoteIp: '1.2.3.4',
}

const cardInput = {
  method: 'card' as const,
  plan: 'pro' as const,
  interval: 'annual' as const,
  cpfCnpj: '11144477735',
  card: {
    holderName: 'GABRIEL BASTOS',
    number: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2030',
    ccv: '123',
  },
  postalCode: '01310-100',
  addressNumber: '100',
  phone: '11999998888',
  userId: USER_ID,
  remoteIp: '9.9.9.9',
}

describe('startLocalCheckout (pix)', () => {
  it('creates a customer, subscription, intent and returns the QR', async () => {
    const gateway = fakeGateway()
    const { start, billingCustomers, checkoutIntents } = await setup(gateway)

    const result = await start(pixInput)

    expect(result).toEqual({
      method: 'pix',
      encodedImage: 'BASE64PNG',
      payload: 'pix-copy-paste',
      expiresAt: '2026-06-25T10:00:00Z',
    })
    expect(gateway.createCustomer).toHaveBeenCalledWith({
      name: 'Gabriel',
      email: null,
      cpfCnpj: '11144477735',
      phone: null,
      postalCode: null,
      addressNumber: null,
    })
    expect(gateway.createPixSubscription).toHaveBeenCalledWith({
      customerId: 'cus_new',
      userId: USER_ID,
      plan: 'pro',
      interval: 'monthly',
    })
    const saved = await billingCustomers.findByUser('asaas', USER_ID)
    expect(saved?.customerId).toBe('cus_new')
    const intent = await checkoutIntents.findByReference(
      'asaas',
      'u1|pro|monthly',
    )
    expect(intent).not.toBeNull()
  })

  it('reuses an existing Asaas customer instead of creating a new one', async () => {
    const gateway = fakeGateway()
    const { start, billingCustomers } = await setup(gateway)
    await billingCustomers.save(
      BillingCustomer.create({
        id: asEntityId('33333333-3333-4333-8333-333333333333'),
        userId: asEntityId(USER_ID),
        provider: 'asaas',
        customerId: 'cus_existing',
        createdAt: clock.now(),
      }),
    )

    await start(pixInput)

    expect(gateway.createCustomer).not.toHaveBeenCalled()
    expect(gateway.createPixSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: 'cus_existing' }),
    )
  })
})

describe('startLocalCheckout (card)', () => {
  it('creates a card subscription with holder info and records the intent', async () => {
    const gateway = fakeGateway()
    const { start, checkoutIntents } = await setup(gateway)

    const result = await start(cardInput)

    expect(result).toEqual({ method: 'card' })
    expect(gateway.createCustomer).toHaveBeenCalledWith({
      name: 'Gabriel',
      email: null,
      cpfCnpj: '11144477735',
      phone: '11999998888',
      postalCode: '01310-100',
      addressNumber: '100',
    })
    expect(gateway.createCardSubscription).toHaveBeenCalledWith({
      customerId: 'cus_new',
      userId: USER_ID,
      plan: 'pro',
      interval: 'annual',
      card: cardInput.card,
      holder: {
        name: 'Gabriel',
        email: null,
        cpfCnpj: '11144477735',
        postalCode: '01310-100',
        addressNumber: '100',
        phone: '11999998888',
      },
      remoteIp: '9.9.9.9',
    })
    const intent = await checkoutIntents.findByReference(
      'asaas',
      'u1|pro|annual',
    )
    expect(intent).not.toBeNull()
  })
})

describe('startLocalCheckout errors', () => {
  it('throws when the user does not exist', async () => {
    const gateway = fakeGateway()
    const { start } = await setup(gateway)
    await expect(start({ ...pixInput, userId: GHOST_ID })).rejects.toThrow(
      'User not found',
    )
  })
})
