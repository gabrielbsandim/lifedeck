import { describe, expect, it } from 'vitest'
import { localCheckoutRequestSchema } from '@/dtos/billing-dto'

const basePix = {
  method: 'pix',
  plan: 'pro',
  interval: 'monthly',
  cpfCnpj: '111.444.777-35',
}

const baseCard = {
  method: 'card',
  plan: 'premium',
  interval: 'annual',
  cpfCnpj: '11144477735',
  card: {
    holderName: 'Gabriel Bastos',
    number: '4111111111111111',
    expiryMonth: '12',
    expiryYear: '2030',
    ccv: '123',
  },
  postalCode: '01310-100',
  addressNumber: '100',
  phone: '11999998888',
}

describe('localCheckoutRequestSchema', () => {
  it('accepts a valid pix request', () => {
    const parsed = localCheckoutRequestSchema.parse(basePix)
    expect(parsed.method).toBe('pix')
    expect(parsed.cpfCnpj).toBe('111.444.777-35')
  })

  it('accepts a valid card request', () => {
    const parsed = localCheckoutRequestSchema.parse(baseCard)
    expect(parsed.method).toBe('card')
  })

  it('rejects an invalid CPF', () => {
    expect(
      localCheckoutRequestSchema.safeParse({
        ...basePix,
        cpfCnpj: '123.456.789-00',
      }).success,
    ).toBe(false)
  })

  it('rejects an unknown payment method', () => {
    expect(
      localCheckoutRequestSchema.safeParse({ ...basePix, method: 'boleto' })
        .success,
    ).toBe(false)
  })

  it('rejects an invalid card number', () => {
    expect(
      localCheckoutRequestSchema.safeParse({
        ...baseCard,
        card: { ...baseCard.card, number: '41111' },
      }).success,
    ).toBe(false)
  })

  it('rejects an invalid expiry month', () => {
    expect(
      localCheckoutRequestSchema.safeParse({
        ...baseCard,
        card: { ...baseCard.card, expiryMonth: '13' },
      }).success,
    ).toBe(false)
  })

  it('rejects an invalid postal code', () => {
    expect(
      localCheckoutRequestSchema.safeParse({ ...baseCard, postalCode: 'abc' })
        .success,
    ).toBe(false)
  })

  it('rejects a card request missing the billing address number', () => {
    const { addressNumber: _omitted, ...withoutAddress } = baseCard
    expect(localCheckoutRequestSchema.safeParse(withoutAddress).success).toBe(
      false,
    )
  })
})
