'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import {
  CURRENCY_BY_MARKET,
  MARKET_BY_CURRENCY,
  annualEquivalentMonthly,
  annualSavings,
  defaultMarket,
  formatPrice,
  priceLabel,
  type Currency,
  type Interval,
  type Market,
  type PaidPlan,
  type Plan,
} from '@/lib/billing/prices'
import { compareRows, type CompareCell } from '@/lib/billing/compare-rows'
import { SegmentedControl } from '@/components/settings/settings-ui'
import { CheckIcon, ChevronLeftIcon } from '@/components/icons'
import { CheckoutDialog } from '@/components/billing/checkout-dialog'

type PlanKey = Plan

export function PlansScreen() {
  const { messages } = useI18n()
  const t = messages.billing
  const session = useSession()
  const params = useSearchParams()
  const [interval, setInterval] = useState<Interval>('annual')
  const [currencyOverride, setCurrencyOverride] = useState<Currency | null>(
    null,
  )
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlan | null>(null)

  const currentPlan = session.data?.plan ?? 'free'
  const detectedMarket = defaultMarket(
    session.data?.country,
    session.data?.locale,
  )
  const market: Market = currencyOverride
    ? MARKET_BY_CURRENCY[currencyOverride]
    : detectedMarket
  const currency = CURRENCY_BY_MARKET[market]
  const status = params.get('status')
  const annual = interval === 'annual'

  const rows = compareRows(messages)

  function subLine(plan: PaidPlan): string {
    if (!annual) {
      return ''
    }
    const eq = t.eqApprox.replace(
      '{amount}',
      formatPrice(annualEquivalentMonthly(market, plan), currency),
    )
    const save = t.savePerYear.replace(
      '{amount}',
      formatPrice(annualSavings(market, plan), currency),
    )
    return `${eq} · ${save}`
  }

  const cards: PlanCardProps[] = [
    {
      plan: 'free',
      order: 'order-3 lg:order-none',
      price: formatPrice(0, currency),
      suffix: '',
      sub: '',
      features: t.freeFeatures,
      checkClass: 'text-ink-500',
      isCurrent: currentPlan === 'free',
    },
    {
      plan: 'pro',
      order: 'order-1 lg:order-none',
      recommended: true,
      price: priceLabel(market, 'pro', interval),
      suffix: annual ? t.perYear : t.perMonth,
      sub: subLine('pro'),
      features: t.proFeatures,
      checkClass: 'text-brand-600',
      isCurrent: currentPlan === 'pro',
      onSubscribe: () => setCheckoutPlan('pro'),
    },
    {
      plan: 'premium',
      order: 'order-2 lg:order-none',
      price: priceLabel(market, 'premium', interval),
      suffix: annual ? t.perYear : t.perMonth,
      sub: subLine('premium'),
      features: t.premiumFeatures,
      checkClass: 'text-violet-500',
      isCurrent: currentPlan === 'premium',
      onSubscribe: () => setCheckoutPlan('premium'),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/settings"
        className="text-brand-600 flex w-fit items-center gap-1.5 text-[13px] font-semibold"
      >
        <ChevronLeftIcon size={14} />
        {t.back}
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div>
          <h1 className="text-ink-900 text-2xl font-extrabold tracking-tight sm:text-[26px]">
            {t.plansTitle}
          </h1>
          <p className="text-ink-500 mt-1 text-sm">{t.tagline}</p>
        </div>
        <div className="flex w-full items-center gap-2.5 lg:w-auto">
          <button
            type="button"
            onClick={() =>
              setCurrencyOverride(currency === 'BRL' ? 'USD' : 'BRL')
            }
            className="border-line text-ink-600 h-9 flex-none rounded-full border bg-white px-3.5 text-xs font-bold"
          >
            {currency}
          </button>
          <SegmentedControl
            className="flex-1 lg:w-auto lg:flex-none"
            value={interval}
            onChange={setInterval}
            options={[
              { value: 'monthly', label: t.monthly },
              {
                value: 'annual',
                label: t.annual,
                badge: (
                  <span className="bg-success/15 text-success whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10.5px] font-bold">
                    {t.annualHint}
                  </span>
                ),
              },
            ]}
          />
        </div>
      </div>

      {status === 'success' && (
        <div className="border-success/30 bg-success/10 text-success rounded-xl border px-4 py-3 text-sm">
          {t.successBanner}
        </div>
      )}
      {status === 'cancelled' && (
        <div className="border-line text-ink-700 bg-bg rounded-xl border px-4 py-3 text-sm">
          {t.cancelledBanner}
        </div>
      )}

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        {cards.map(card => (
          <PlanCard key={card.plan} {...card} />
        ))}
      </div>

      <CompareTable rows={rows} />

      <p className="text-ink-500 text-center text-xs leading-relaxed">
        {t.footerCancel}
        <br />
        {t.pricesIn.replace(
          '{currency}',
          currency === 'BRL' ? t.currencyLongBRL : t.currencyLongUSD,
        )}
      </p>

      {checkoutPlan && (
        <CheckoutDialog
          plan={checkoutPlan}
          interval={interval}
          market={market}
          currency={currency}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </div>
  )
}

type PlanCardProps = {
  plan: PlanKey
  order: string
  recommended?: boolean
  price: string
  suffix: string
  sub: string
  features: string[]
  checkClass: string
  isCurrent: boolean
  onSubscribe?: () => void
}

function PlanCard({
  plan,
  order,
  recommended,
  price,
  suffix,
  sub,
  features,
  checkClass,
  isCurrent,
  onSubscribe,
}: PlanCardProps) {
  const { messages } = useI18n()
  const t = messages.billing
  const name = plan === 'free' ? t.free : plan === 'pro' ? t.pro : t.premium

  return (
    <div
      className={cn(
        'relative flex flex-col gap-2 rounded-[18px] bg-white p-5',
        order,
        recommended
          ? 'border-brand-600 border-2 shadow-lg'
          : 'border-line border shadow-sm',
      )}
    >
      {recommended && (
        <span className="bg-brand-600 absolute -top-[11px] left-5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-[0.06em] text-white">
          {t.recommended.toUpperCase()}
        </span>
      )}
      <div className="flex items-center gap-2">
        <span className="text-ink-900 text-base font-bold">{name}</span>
        {isCurrent && (
          <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase">
            {t.yourPlanBadge}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-ink-900 text-2xl font-extrabold">{price}</span>
        {suffix && <span className="text-ink-500 text-[13px]">{suffix}</span>}
      </div>
      <div className="text-success min-h-4 text-xs font-medium">{sub}</div>
      <ul className="text-ink-700 flex flex-1 flex-col gap-[7px] text-[13px]">
        {features.map(feature => (
          <li key={feature} className="flex items-center gap-2">
            <CheckIcon size={13} className={cn('shrink-0', checkClass)} />
            {feature}
          </li>
        ))}
      </ul>
      {!isCurrent && onSubscribe && (
        <button
          type="button"
          onClick={onSubscribe}
          className={cn(
            'mt-2 h-[42px] rounded-xl text-sm font-semibold transition-colors',
            recommended
              ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-md'
              : 'border-brand-300 text-brand-700 hover:bg-brand-50 border bg-white',
          )}
        >
          {t.subscribePlan.replace('{plan}', name)}
        </button>
      )}
    </div>
  )
}

function Cell({ value, tone }: { value: CompareCell; tone: string }) {
  const { messages } = useI18n()
  let content: ReactNode
  if (value === true) {
    content = <CheckIcon size={15} className={cn('inline', tone)} />
  } else if (value === false) {
    content = <span className="text-ink-300">—</span>
  } else {
    content = (
      <span className="text-ink-400 text-[11px] font-bold">
        {messages.billing.sample.toUpperCase()}
      </span>
    )
  }
  return <span className="text-center">{content}</span>
}

function CompareTable({ rows }: { rows: ReturnType<typeof compareRows> }) {
  const { messages } = useI18n()
  const t = messages.billing
  return (
    <div className="border-line overflow-hidden rounded-2xl border">
      <div className="border-line bg-bg grid grid-cols-[1fr_64px_64px_80px] items-center border-b px-4 py-3 sm:grid-cols-[1fr_110px_110px_110px] sm:px-5">
        <span className="text-ink-900 text-[13px] font-bold">{t.compare}</span>
        <span className="text-ink-500 text-center text-[11px] font-bold">
          {t.free.toUpperCase()}
        </span>
        <span className="text-brand-600 text-center text-[11px] font-bold">
          {t.pro.toUpperCase()}
        </span>
        <span className="text-center text-[11px] font-bold text-violet-500">
          {t.premium.toUpperCase()}
        </span>
      </div>
      {rows.map(row => (
        <div
          key={row.label}
          className="border-line/70 grid min-h-11 grid-cols-[1fr_64px_64px_80px] items-center border-b px-4 py-1.5 last:border-b-0 sm:grid-cols-[1fr_110px_110px_110px] sm:px-5"
        >
          <span className="text-ink-700 pr-2 text-[13px] leading-tight">
            {row.label}
          </span>
          <Cell value={row.free} tone="text-ink-500" />
          <Cell value={row.pro} tone="text-brand-600" />
          <Cell value={row.premium} tone="text-violet-500" />
        </div>
      ))}
    </div>
  )
}
