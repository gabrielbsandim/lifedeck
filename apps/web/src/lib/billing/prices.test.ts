import { describe, expect, it } from 'vitest'
import {
  PRICES,
  priceLabel,
  type Interval,
  type Market,
  type PaidPlan,
} from '@/lib/billing/prices'

const MARKETS: Market[] = ['BR', 'INTL']
const PLANS: PaidPlan[] = ['pro', 'premium']
const INTERVALS: Interval[] = ['monthly', 'annual']

describe('billing prices', () => {
  it('defines a non-empty price for every market, plan, and interval', () => {
    for (const market of MARKETS) {
      for (const plan of PLANS) {
        for (const interval of INTERVALS) {
          const label = priceLabel(market, plan, interval)
          expect(label).toBe(PRICES[market][plan][interval])
          expect(label.trim().length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('prices the annual plan below twelve monthly payments', () => {
    // A sanity check on the annual discount so a typo cannot make the yearly
    // plan cost more than paying monthly. Parses the numeric part loosely.
    const amount = (label: string) =>
      Number(
        label
          .replace(/[^0-9.,]/g, '')
          .replace(/\.(?=\d{3})/g, '')
          .replace(',', '.'),
      )
    for (const market of MARKETS) {
      for (const plan of PLANS) {
        const monthly = amount(PRICES[market][plan].monthly)
        const annual = amount(PRICES[market][plan].annual)
        expect(annual).toBeLessThan(monthly * 12)
      }
    }
  })
})
