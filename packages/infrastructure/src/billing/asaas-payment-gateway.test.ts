import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AsaasPaymentGateway } from '@/billing/asaas-payment-gateway'
import type { CheckoutInput } from '@lifedeck/application'

const BASE = 'https://asaas.test'
const TOKEN = 'whtok'

function setEnv() {
  process.env.ASAAS_BASE_URL = `${BASE}/`
  process.env.ASAAS_API_KEY = 'asaas_key'
  process.env.ASAAS_WEBHOOK_TOKEN = TOKEN
  process.env.ASAAS_VALUE_PRO_MONTHLY = '14.90'
  process.env.ASAAS_VALUE_PRO_ANNUAL = '149'
  process.env.ASAAS_VALUE_PREMIUM_MONTHLY = '29.90'
  process.env.ASAAS_VALUE_PREMIUM_ANNUAL = '299'
}

function clearEnv() {
  for (const key of [
    'ASAAS_BASE_URL',
    'ASAAS_API_KEY',
    'ASAAS_WEBHOOK_TOKEN',
    'ASAAS_VALUE_PRO_MONTHLY',
    'ASAAS_VALUE_PRO_ANNUAL',
    'ASAAS_VALUE_PREMIUM_MONTHLY',
    'ASAAS_VALUE_PREMIUM_ANNUAL',
  ]) {
    delete process.env[key]
  }
}

function jsonResponse(data: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => data, text: async () => '' }
}

function stub(handler: (url: string, init?: RequestInit) => unknown) {
  const mock = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(handler(url, init) as Response),
  )
  vi.stubGlobal('fetch', mock)
  return mock
}

const checkout: CheckoutInput = {
  userId: 'user-1',
  email: 'gab@example.com',
  plan: 'pro',
  interval: 'monthly',
  successUrl: 'https://app/success',
  cancelUrl: 'https://app/cancel',
}

describe('AsaasPaymentGateway', () => {
  beforeEach(() => {
    setEnv()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    clearEnv()
  })

  describe('config', () => {
    it.each(['ASAAS_BASE_URL', 'ASAAS_API_KEY', 'ASAAS_WEBHOOK_TOKEN'])(
      'throws when %s is missing',
      async key => {
        delete process.env[key]
        await expect(
          new AsaasPaymentGateway().cancelSubscription('sub_1'),
        ).rejects.toThrow(`${key} env var is not set`)
      },
    )
  })

  describe('startCheckout', () => {
    it('creates a recurring payment link and returns the encoded reference', async () => {
      const mock = stub(() => jsonResponse({ url: 'https://pay/link' }))
      const result = await new AsaasPaymentGateway().startCheckout(checkout)

      expect(result).toEqual({
        url: 'https://pay/link',
        reference: 'user-1|pro|monthly',
      })
      const [url, init] = mock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${BASE}/v3/paymentLinks`)
      const body = JSON.parse(init.body as string)
      expect(body.value).toBe(14.9)
      expect(body.subscriptionCycle).toBe('MONTHLY')
      expect(body.externalReference).toBe('user-1|pro|monthly')
    })

    it('sends the yearly cycle and annual value', async () => {
      const mock = stub(() => jsonResponse({ url: 'https://pay/link' }))
      await new AsaasPaymentGateway().startCheckout({
        ...checkout,
        plan: 'premium',
        interval: 'annual',
      })
      const body = JSON.parse(
        (mock.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.subscriptionCycle).toBe('YEARLY')
      expect(body.value).toBe(299)
    })

    it('throws when no value is configured for the plan', async () => {
      delete process.env.ASAAS_VALUE_PRO_MONTHLY
      await expect(
        new AsaasPaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/No Asaas value configured/)
    })

    it('refuses a non-numeric amount', async () => {
      process.env.ASAAS_VALUE_PRO_MONTHLY = '14,90'
      await expect(
        new AsaasPaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/Invalid Asaas amount/)
    })

    it('refuses a non-positive amount', async () => {
      process.env.ASAAS_VALUE_PRO_MONTHLY = '-5'
      await expect(
        new AsaasPaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/Invalid Asaas amount/)
    })

    it('throws when Asaas rejects the request', async () => {
      stub(() => jsonResponse({}, false, 400))
      await expect(
        new AsaasPaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/Asaas checkout failed with status 400/)
    })

    it('throws when the link has no url', async () => {
      stub(() => jsonResponse({}))
      await expect(
        new AsaasPaymentGateway().startCheckout(checkout),
      ).rejects.toThrow(/no URL/)
    })
  })

  describe('parseWebhook', () => {
    const gw = () => new AsaasPaymentGateway()

    it('rejects a bad token', async () => {
      expect(await gw().parseWebhook('{}', 'wrong')).toBeNull()
    })

    it('rejects a missing signature', async () => {
      expect(await gw().parseWebhook('{}', null)).toBeNull()
    })

    it('ignores a payload without a subscription ref', async () => {
      const body = JSON.stringify({ event: 'PAYMENT_CONFIRMED' })
      expect(await gw().parseWebhook(body, TOKEN)).toBeNull()
    })

    it('ignores an unmapped event type', async () => {
      const body = JSON.stringify({
        event: 'PAYMENT_UPDATED',
        payment: { subscription: 'sub_9' },
      })
      expect(await gw().parseWebhook(body, TOKEN)).toBeNull()
    })

    it('uses the exact nextDueDate from the subscription for active events', async () => {
      stub(url =>
        url.includes('/v3/subscriptions/')
          ? jsonResponse({ nextDueDate: '2027-07-24' })
          : jsonResponse({}),
      )
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|annual',
          dueDate: '2026-07-24',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.status).toBe('active')
      expect(event?.userId).toBe('user-1')
      expect(event?.plan).toBe('pro')
      expect(event?.currentPeriodEnd).toEqual(new Date('2027-07-24'))
    })

    it('falls back to the interval estimate when the lookup fails', async () => {
      stub(url =>
        url.includes('/v3/subscriptions/')
          ? jsonResponse({}, false, 500)
          : jsonResponse({}),
      )
      const body = JSON.stringify({
        event: 'PAYMENT_RECEIVED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|annual',
          dueDate: '2026-07-24',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      // annual estimate: dueDate + 1 year
      expect(event?.currentPeriodEnd).toEqual(new Date('2027-07-24'))
    })

    it('has no period end for a non-active status and decodes the ref', async () => {
      const body = JSON.stringify({
        event: 'SUBSCRIPTION_DELETED',
        subscription: {
          id: 'sub_1',
          externalReference: 'user-1|premium|monthly',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.status).toBe('canceled')
      expect(event?.currentPeriodEnd).toBeNull()
      expect(event?.plan).toBe('premium')
    })

    it('falls back to a monthly estimate and ignores an invalid nextDueDate', async () => {
      stub(url =>
        url.includes('/v3/subscriptions/')
          ? jsonResponse({ nextDueDate: 'not-a-date' })
          : jsonResponse({}),
      )
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|monthly',
          dueDate: '2026-07-24',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      // monthly estimate: dueDate + 1 month
      expect(event?.currentPeriodEnd).toEqual(new Date('2026-08-24'))
    })

    it('ignores an unparseable dueDate when estimating the period', async () => {
      stub(url =>
        url.includes('/v3/subscriptions/')
          ? jsonResponse({}, false, 500)
          : jsonResponse({}),
      )
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|monthly',
          dueDate: 'not-a-date',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.currentPeriodEnd).toBeNull()
    })

    it('ignores a subscription payload with no usable nextDueDate field', async () => {
      stub(url =>
        url.includes('/v3/subscriptions/')
          ? jsonResponse({ status: 'ACTIVE' })
          : jsonResponse({}),
      )
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|monthly',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      // No nextDueDate and no dueDate to estimate from.
      expect(event?.currentPeriodEnd).toBeNull()
    })

    it('falls back when the lookup throws', async () => {
      stub(url => {
        if (url.includes('/v3/subscriptions/')) {
          throw new Error('network down')
        }
        return jsonResponse({})
      })
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|pro|monthly',
          dueDate: '2026-07-24',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.currentPeriodEnd).toEqual(new Date('2026-08-24'))
    })

    it('nulls out an unrecognized plan in the reference', async () => {
      stub(() => jsonResponse({ nextDueDate: '2026-08-24' }))
      const body = JSON.stringify({
        event: 'PAYMENT_CONFIRMED',
        payment: {
          subscription: 'sub_1',
          externalReference: 'user-1|gold|monthly',
        },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.plan).toBeNull()
      expect(event?.userId).toBe('user-1')
    })

    it('maps overdue payments to past_due', async () => {
      stub(() => jsonResponse({}, false, 404))
      const body = JSON.stringify({
        event: 'PAYMENT_OVERDUE',
        payment: { subscription: 'sub_1' },
      })
      const event = await gw().parseWebhook(body, TOKEN)
      expect(event?.status).toBe('past_due')
      // past_due is not active, so no lookup and no period end.
      expect(event?.currentPeriodEnd).toBeNull()
    })
  })

  describe('createCustomer', () => {
    it('posts the customer and returns its id', async () => {
      const mock = stub(() => jsonResponse({ id: 'cus_1' }))
      const id = await new AsaasPaymentGateway().createCustomer({
        name: 'Gabriel',
        email: 'g@x.com',
        cpfCnpj: '11144477735',
        phone: '11999998888',
        postalCode: '01310100',
        addressNumber: '100',
      })
      expect(id).toBe('cus_1')
      const [url, init] = mock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${BASE}/v3/customers`)
      const body = JSON.parse(init.body as string)
      expect(body.cpfCnpj).toBe('11144477735')
      expect(body.mobilePhone).toBe('11999998888')
    })

    it('throws when Asaas rejects the customer', async () => {
      stub(() => jsonResponse({}, false, 400))
      await expect(
        new AsaasPaymentGateway().createCustomer({
          name: 'G',
          email: null,
          cpfCnpj: '11144477735',
        }),
      ).rejects.toThrow(/customer creation failed with status 400/)
    })

    it('throws when the customer has no id', async () => {
      stub(() => jsonResponse({}))
      await expect(
        new AsaasPaymentGateway().createCustomer({
          name: 'G',
          email: null,
          cpfCnpj: '11144477735',
        }),
      ).rejects.toThrow(/customer has no id/)
    })
  })

  describe('createPixSubscription', () => {
    const pixSub = {
      customerId: 'cus_1',
      userId: 'user-1',
      plan: 'pro',
      interval: 'monthly',
    } as const

    function pixStub() {
      return stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.includes('/v3/subscriptions/') && url.endsWith('/payments')) {
          return jsonResponse({ data: [{ id: 'pay_1' }] })
        }
        if (url.endsWith('/pixQrCode')) {
          return jsonResponse({
            encodedImage: 'IMG',
            payload: 'CODE',
            expirationDate: '2026-06-25',
          })
        }
        return jsonResponse({})
      })
    }

    it('creates the subscription, finds the payment and returns the QR', async () => {
      pixStub()
      const charge = await new AsaasPaymentGateway().createPixSubscription(
        pixSub,
      )
      expect(charge).toEqual({
        subscriptionRef: 'sub_1',
        paymentId: 'pay_1',
        encodedImage: 'IMG',
        payload: 'CODE',
        expiresAt: '2026-06-25',
        reference: 'user-1|pro|monthly',
      })
    })

    it('sends billingType PIX with the right value, cycle and reference', async () => {
      const mock = pixStub()
      await new AsaasPaymentGateway().createPixSubscription(pixSub)
      const body = JSON.parse(
        (mock.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.billingType).toBe('PIX')
      expect(body.value).toBe(14.9)
      expect(body.cycle).toBe('MONTHLY')
      expect(body.externalReference).toBe('user-1|pro|monthly')
      expect(body.nextDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('defaults expiresAt to null when Asaas omits it', async () => {
      stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.endsWith('/payments')) {
          return jsonResponse({ data: [{ id: 'pay_1' }] })
        }
        return jsonResponse({ encodedImage: 'IMG', payload: 'CODE' })
      })
      const charge = await new AsaasPaymentGateway().createPixSubscription(
        pixSub,
      )
      expect(charge.expiresAt).toBeNull()
    })

    it('throws when the subscription creation fails', async () => {
      stub(url =>
        url.endsWith('/v3/subscriptions')
          ? jsonResponse({}, false, 400)
          : jsonResponse({}),
      )
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/Pix subscription failed with status 400/)
    })

    it('throws when there is no first payment yet', async () => {
      stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.endsWith('/payments')) {
          return jsonResponse({ data: [] })
        }
        return jsonResponse({})
      })
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/no first payment yet/)
    })

    it('throws when the payments lookup fails', async () => {
      stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.endsWith('/payments')) {
          return jsonResponse({}, false, 500)
        }
        return jsonResponse({})
      })
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/payments lookup failed with status 500/)
    })

    it('throws when the QR code is incomplete', async () => {
      stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.endsWith('/payments')) {
          return jsonResponse({ data: [{ id: 'pay_1' }] })
        }
        return jsonResponse({ payload: 'CODE' })
      })
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/QR code is incomplete/)
    })

    it('throws when the QR lookup fails', async () => {
      stub(url => {
        if (url.endsWith('/v3/subscriptions')) {
          return jsonResponse({ id: 'sub_1' })
        }
        if (url.endsWith('/payments')) {
          return jsonResponse({ data: [{ id: 'pay_1' }] })
        }
        return jsonResponse({}, false, 404)
      })
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/QR code lookup failed with status 404/)
    })

    it('throws when the subscription has no id', async () => {
      stub(url =>
        url.endsWith('/v3/subscriptions') ? jsonResponse({}) : jsonResponse({}),
      )
      await expect(
        new AsaasPaymentGateway().createPixSubscription(pixSub),
      ).rejects.toThrow(/subscription has no id/)
    })
  })

  describe('createCardSubscription', () => {
    const cardSub = {
      customerId: 'cus_1',
      userId: 'user-1',
      plan: 'premium',
      interval: 'annual',
      card: {
        holderName: 'Gabriel Bastos',
        number: '4111111111111111',
        expiryMonth: '12',
        expiryYear: '2030',
        ccv: '123',
      },
      holder: {
        name: 'Gabriel Bastos',
        email: 'g@x.com',
        cpfCnpj: '11144477735',
        postalCode: '01310100',
        addressNumber: '100',
        phone: '11999998888',
      },
      remoteIp: '1.2.3.4',
    } as const

    it('creates a CREDIT_CARD subscription and returns the reference', async () => {
      const mock = stub(() => jsonResponse({ id: 'sub_9' }))
      const result = await new AsaasPaymentGateway().createCardSubscription(
        cardSub,
      )
      expect(result).toEqual({
        subscriptionRef: 'sub_9',
        reference: 'user-1|premium|annual',
      })
      const body = JSON.parse(
        (mock.mock.calls[0] as [string, RequestInit])[1].body as string,
      )
      expect(body.billingType).toBe('CREDIT_CARD')
      expect(body.value).toBe(299)
      expect(body.cycle).toBe('YEARLY')
      expect(body.creditCard.number).toBe('4111111111111111')
      expect(body.creditCardHolderInfo.cpfCnpj).toBe('11144477735')
      expect(body.remoteIp).toBe('1.2.3.4')
    })

    it('throws when the card subscription is refused', async () => {
      stub(() => jsonResponse({}, false, 402))
      await expect(
        new AsaasPaymentGateway().createCardSubscription(cardSub),
      ).rejects.toThrow(/card subscription failed with status 402/)
    })

    it('throws when the subscription has no id', async () => {
      stub(() => jsonResponse({}))
      await expect(
        new AsaasPaymentGateway().createCardSubscription(cardSub),
      ).rejects.toThrow(/subscription has no id/)
    })
  })

  describe('cancelSubscription', () => {
    it('deletes the subscription', async () => {
      const mock = stub(() => jsonResponse({}, true, 200))
      await new AsaasPaymentGateway().cancelSubscription('sub_1')
      const [url, init] = mock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${BASE}/v3/subscriptions/sub_1`)
      expect(init.method).toBe('DELETE')
    })

    it('treats a 404 as already gone', async () => {
      stub(() => jsonResponse({}, false, 404))
      await expect(
        new AsaasPaymentGateway().cancelSubscription('sub_1'),
      ).resolves.toBeUndefined()
    })

    it('throws on other failures', async () => {
      stub(() => jsonResponse({}, false, 500))
      await expect(
        new AsaasPaymentGateway().cancelSubscription('sub_1'),
      ).rejects.toThrow(/Asaas cancel failed with status 500/)
    })
  })
})
