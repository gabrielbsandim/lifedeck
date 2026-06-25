'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Card } from '@lifedeck/ui'
import type { CheckoutRequest } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useStartCheckout } from '@/lib/api/use-checkout'

type PaidPlan = 'pro' | 'premium'
type Interval = CheckoutRequest['interval']
type Market = CheckoutRequest['market']

const PRICES: Record<Market, Record<PaidPlan, Record<Interval, string>>> = {
  BR: {
    pro: { monthly: 'R$14,90', annual: 'R$149' },
    premium: { monthly: 'R$29,90', annual: 'R$299' },
  },
  INTL: {
    pro: { monthly: 'US$4.99', annual: 'US$49' },
    premium: { monthly: 'US$9.99', annual: 'US$99' },
  },
}

const PLAN_ORDER = ['free', 'pro', 'premium'] as const

export function BillingScreen() {
  const { messages } = useI18n()
  const t = messages.billing
  const session = useSession()
  const params = useSearchParams()
  const checkout = useStartCheckout()
  const [interval, setInterval] = useState<Interval>('annual')

  const currentPlan = session.data?.plan ?? 'free'
  const market: Market = session.data?.locale === 'pt' ? 'BR' : 'INTL'
  const status = params.get('status')

  function start(plan: PaidPlan) {
    checkout.mutate(
      { plan, interval, market },
      {
        onSuccess: result => {
          window.location.href = result.url
        },
      },
    )
  }

  const descriptions: Record<(typeof PLAN_ORDER)[number], string> = {
    free: t.freeDesc,
    pro: t.proDesc,
    premium: t.premiumDesc,
  }
  const names: Record<(typeof PLAN_ORDER)[number], string> = {
    free: t.free,
    pro: t.pro,
    premium: t.premium,
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink-900 text-2xl font-semibold">{t.title}</h1>
        <p className="text-ink-600 text-sm">{t.subtitle}</p>
      </header>

      {status === 'success' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t.successBanner}
        </div>
      )}
      {status === 'cancelled' && (
        <div className="border-line text-ink-700 bg-bg rounded-xl border px-4 py-3 text-sm">
          {t.cancelledBanner}
        </div>
      )}
      {checkout.isError && (
        <div className="text-danger rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          {t.error}
        </div>
      )}

      <div className="bg-bg text-ink-700 inline-flex w-fit gap-1 rounded-full p-1 text-sm font-medium">
        {(['monthly', 'annual'] as Interval[]).map(value => (
          <button
            key={value}
            type="button"
            aria-pressed={interval === value}
            onClick={() => setInterval(value)}
            className={
              interval === value
                ? 'bg-brand-600 rounded-full px-4 py-1.5 text-white'
                : 'rounded-full px-4 py-1.5'
            }
          >
            {value === 'monthly' ? t.monthly : t.annual}
          </button>
        ))}
        <span className="text-brand-700 self-center px-2 text-xs font-semibold">
          {t.annualHint}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLAN_ORDER.map(plan => {
          const isCurrent = currentPlan === plan
          const price = plan === 'free' ? '—' : PRICES[market][plan][interval]
          const suffix =
            plan === 'free'
              ? ''
              : interval === 'monthly'
                ? t.perMonth
                : t.perYear
          return (
            <Card key={plan} className="flex flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-ink-900 text-lg font-semibold">
                  {names[plan]}
                </h2>
                {isCurrent && (
                  <span className="bg-brand-50 text-brand-700 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {t.current}
                  </span>
                )}
              </div>
              <p className="text-ink-900 text-xl font-bold">
                {price}
                <span className="text-ink-500 text-sm font-normal">
                  {suffix}
                </span>
              </p>
              <p className="text-ink-600 flex-1 text-sm">
                {descriptions[plan]}
              </p>
              {plan !== 'free' && !isCurrent && (
                <Button
                  onClick={() => start(plan)}
                  isLoading={checkout.isPending}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending ? t.processing : t.choose}
                </Button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
