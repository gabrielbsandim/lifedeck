import { describe, expect, it, vi } from 'vitest'
import {
  BillingCustomer,
  Subscription,
  User,
  asEntityId,
} from '@lifedeck/domain'
import { makeStartLocalCheckout } from '@/use-cases/start-local-checkout'
import { InMemoryUserRepository } from '@/testing/in-memory-user-repository'
import { InMemoryBillingCustomerRepository } from '@/testing/in-memory-billing-customer-repository'
import { InMemoryCheckoutIntentRepository } from '@/testing/in-memory-checkout-intent-repository'
import { InMemorySubscriptionRepository } from '@/testing/in-memory-subscription-repository'
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
    createPixTrialSubscription: vi.fn().mockResolvedValue({
      subscriptionRef: 'sub_pix_trial',
      reference: 'u1|pro|monthly',
    }),
    ...overrides,
  }
}

// A past (canceled) subscription takes the user out of the first time trial.
async function setup(gateway: LocalPaymentGateway, { history = true } = {}) {
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
  const subscriptions = new InMemorySubscriptionRepository()
  if (history) {
    await subscriptions.save(
      Subscription.create({
        id: asEntityId('55555555-5555-4555-8555-555555555555'),
        userId: asEntityId(USER_ID),
        plan: 'pro',
        status: 'canceled',
        provider: 'asaas',
        providerRef: 'sub_old',
        currentPeriodEnd: new Date('2026-05-01T00:00:00Z'),
        now: new Date('2026-04-01T00:00:00Z'),
      }),
    )
  }
  const start = makeStartLocalCheckout({
    gateway,
    users,
    billingCustomers,
    checkoutIntents,
    subscriptions,
    ids,
    clock,
  })
  return { start, billingCustomers, checkoutIntents, subscriptions }
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
      trialDays: 0,
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
      trialDays: 0,
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

describe('startLocalCheckout (first time Pro trial)', () => {
  const TRIAL_END = '2026-07-01T10:00:00.000Z'

  it('starts a Pix trial with no QR and stores the subscription as trialing', async () => {
    const gateway = fakeGateway()
    const { start, checkoutIntents, subscriptions } = await setup(gateway, {
      history: false,
    })

    const result = await start(pixInput)

    expect(result).toEqual({ method: 'trial', endsAt: TRIAL_END })
    expect(gateway.createPixSubscription).not.toHaveBeenCalled()
    expect(gateway.createPixTrialSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ trialDays: 7 }),
    )
    const stored = await subscriptions.findByProviderRef(
      'asaas',
      'sub_pix_trial',
    )
    expect(stored?.status).toBe('trialing')
    expect(stored?.currentPeriodEnd?.toISOString()).toBe(TRIAL_END)
    expect(stored?.isActive(clock.now())).toBe(true)
    expect(
      await checkoutIntents.findByReference('asaas', 'u1|pro|monthly'),
    ).not.toBeNull()
  })

  it('starts a card trial whose first charge waits for the trial end', async () => {
    const gateway = fakeGateway()
    const { start, subscriptions } = await setup(gateway, { history: false })

    const result = await start(cardInput)

    expect(result).toEqual({ method: 'trial', endsAt: TRIAL_END })
    expect(gateway.createCardSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ trialDays: 7 }),
    )
    const stored = await subscriptions.findByProviderRef('asaas', 'sub_card')
    expect(stored?.status).toBe('trialing')
  })

  it('charges Premium at once even for a first time subscriber', async () => {
    const gateway = fakeGateway()
    const { start } = await setup(gateway, { history: false })

    const result = await start({ ...pixInput, plan: 'premium' })

    expect(result.method).toBe('pix')
    expect(gateway.createPixSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ trialDays: 0 }),
    )
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
