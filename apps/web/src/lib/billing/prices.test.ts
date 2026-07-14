import { describe, expect, it } from 'vitest'
import {
  CURRENCY_BY_MARKET,
  MARKET_BY_CURRENCY,
  PRICE_AMOUNTS,
  defaultMarket,
  formatPrice,
  priceAmount,
  priceLabel,
  type Currency,
  type Interval,
  type Market,
  type PaidPlan,
} from '@/lib/billing/prices'

const MARKETS: Market[] = ['BR', 'INTL']
const PLANS: PaidPlan[] = ['pro', 'premium']
const INTERVALS: Interval[] = ['monthly', 'annual']
const CURRENCIES: Currency[] = ['BRL', 'USD']

describe('billing prices', () => {
  it('defines a positive amount for every market, plan, and interval', () => {
    for (const market of MARKETS) {
      for (const plan of PLANS) {
        for (const interval of INTERVALS) {
          expect(priceAmount(market, plan, interval)).toBeGreaterThan(0)
        }
      }
    }
  })

  it('formats each price as a non-empty currency label', () => {
    for (const market of MARKETS) {
      const label = priceLabel(market, 'pro', 'monthly')
      expect(label.trim().length).toBeGreaterThan(0)
    }
    // BRL renders with the real symbol, USD with the dollar sign.
    expect(priceLabel('BR', 'pro', 'monthly')).toContain('R$')
    expect(priceLabel('INTL', 'pro', 'monthly')).toContain('$')
  })

  it('prices the annual plan below twelve monthly payments', () => {
    for (const market of MARKETS) {
      for (const plan of PLANS) {
        const monthly = priceAmount(market, plan, 'monthly')
        const annual = priceAmount(market, plan, 'annual')
        expect(annual).toBeLessThan(monthly * 12)
      }
    }
  })

  it('maps markets and currencies both ways', () => {
    for (const currency of CURRENCIES) {
      expect(CURRENCY_BY_MARKET[MARKET_BY_CURRENCY[currency]]).toBe(currency)
    }
    expect(PRICE_AMOUNTS.BR.pro.monthly).toBe(14.9)
    expect(formatPrice(4.99, 'USD')).toContain('4.99')
  })
})

describe('defaultMarket', () => {
  it('uses the country when known, ignoring UI language', () => {
    // A Brazilian browsing in English still gets BRL from a BR IP.
    expect(defaultMarket('BR', 'en')).toBe('BR')
    expect(defaultMarket('br', 'en')).toBe('BR')
    expect(defaultMarket('US', 'pt')).toBe('INTL')
    expect(defaultMarket('PT', 'pt')).toBe('INTL')
  })

  it('falls back to the UI language when the country is unknown', () => {
    expect(defaultMarket(null, 'pt')).toBe('BR')
    expect(defaultMarket(undefined, 'pt-BR')).toBe('BR')
    expect(defaultMarket('', 'en')).toBe('INTL')
    expect(defaultMarket(null, null)).toBe('INTL')
  })
})
