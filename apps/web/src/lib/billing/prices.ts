import type { CheckoutRequest } from '@lifedeck/application'

export type PaidPlan = 'pro' | 'premium'
export type Plan = 'free' | PaidPlan
export type Interval = CheckoutRequest['interval']
export type Market = CheckoutRequest['market']
export type Currency = 'BRL' | 'USD'

// A market maps one-to-one to a currency (and, server-side, to a gateway:
// BRL -> Asaas, USD -> Stripe). Currency is the user-facing concept; market is
// the transport that already flows through the checkout DTO.
export const CURRENCY_BY_MARKET: Record<Market, Currency> = {
  BR: 'BRL',
  INTL: 'USD',
}

export const MARKET_BY_CURRENCY: Record<Currency, Market> = {
  BRL: 'BR',
  USD: 'INTL',
}

// Locale used only to render each currency in its conventional style, so a
// Brazilian sees "R$ 14,90" and an international user sees "$4.99" regardless of
// the app's UI language.
const FORMAT_LOCALE: Record<Currency, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
}

// Numeric price book, per currency. The gateway (STRIPE_PRICE_* / ASAAS_VALUE_*)
// is what actually charges; these amounts are what the user sees and MUST match
// the gateway config. The completeness test guards against a missing entry.
export const PRICE_AMOUNTS: Record<
  Market,
  Record<PaidPlan, Record<Interval, number>>
> = {
  BR: {
    pro: { monthly: 14.9, annual: 149 },
    premium: { monthly: 29.9, annual: 299 },
  },
  INTL: {
    pro: { monthly: 4.99, annual: 49 },
    premium: { monthly: 9.99, annual: 99 },
  },
}

export function priceAmount(
  market: Market,
  plan: PaidPlan,
  interval: Interval,
): number {
  return PRICE_AMOUNTS[market][plan][interval]
}

export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(FORMAT_LOCALE[currency], {
    style: 'currency',
    currency,
  }).format(amount)
}

export function priceLabel(
  market: Market,
  plan: PaidPlan,
  interval: Interval,
): string {
  return formatPrice(
    priceAmount(market, plan, interval),
    CURRENCY_BY_MARKET[market],
  )
}

// What one month of the annual plan effectively costs, shown as the "≈ R$ 12,42/mo"
// hint on annual pricing so the saving over monthly is legible at a glance.
export function annualEquivalentMonthly(
  market: Market,
  plan: PaidPlan,
): number {
  return priceAmount(market, plan, 'annual') / 12
}

// How much a year on the annual plan saves versus paying monthly for 12 months.
export function annualSavings(market: Market, plan: PaidPlan): number {
  return (
    priceAmount(market, plan, 'monthly') * 12 -
    priceAmount(market, plan, 'annual')
  )
}

/**
 * Decide the currency/market from the customer's country (resolved from the
 * request IP), falling back to their UI language only when the country is
 * unknown. It is always user-overridable on the billing screen. Language alone
 * never decides currency: a Brazilian browsing in English still gets BRL from a
 * Brazilian IP.
 */
export function defaultMarket(
  country: string | null | undefined,
  locale: string | null | undefined,
): Market {
  if (country) {
    return country.toUpperCase() === 'BR' ? 'BR' : 'INTL'
  }
  return (locale ?? '').toLowerCase().startsWith('pt') ? 'BR' : 'INTL'
}
