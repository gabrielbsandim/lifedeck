import type { CheckoutRequest } from '@lifedeck/application'

export type PaidPlan = 'pro' | 'premium'
export type Interval = CheckoutRequest['interval']
export type Market = CheckoutRequest['market']

// Display prices for the billing screen. These MUST stay in sync with the
// gateway price refs configured in env (STRIPE_PRICE_* and ASAAS_VALUE_*): the
// gateway is what actually charges, this table is only what the user sees. The
// completeness test guards against a missing plan/interval entry; keeping the
// values themselves aligned with the gateway config is a release checklist item.
export const PRICES: Record<
  Market,
  Record<PaidPlan, Record<Interval, string>>
> = {
  BR: {
    pro: { monthly: 'R$14,90', annual: 'R$149' },
    premium: { monthly: 'R$29,90', annual: 'R$299' },
  },
  INTL: {
    pro: { monthly: 'US$4.99', annual: 'US$49' },
    premium: { monthly: 'US$9.99', annual: 'US$99' },
  },
}

export function priceLabel(
  market: Market,
  plan: PaidPlan,
  interval: Interval,
): string {
  return PRICES[market][plan][interval]
}
