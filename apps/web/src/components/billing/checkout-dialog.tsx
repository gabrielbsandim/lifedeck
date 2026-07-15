'use client'

import { useEffect } from 'react'
import { Button, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useStartCheckout } from '@/lib/api/use-checkout'
import {
  annualSavings,
  formatPrice,
  priceLabel,
  type Currency,
  type Interval,
  type Market,
  type PaidPlan,
} from '@/lib/billing/prices'
import { planName } from '@/lib/billing/plan-display'
import { CloseIcon } from '@/components/icons'

/**
 * Checkout summary. Confirming sends the customer to the provider's secure
 * hosted checkout (Asaas for BR, Stripe for INTL). In Phase 2 the BR flow gains
 * in-app Pix and card entry; this dialog is the shell it plugs into.
 */
export function CheckoutDialog({
  plan,
  interval,
  market,
  currency,
  onClose,
}: {
  plan: PaidPlan
  interval: Interval
  market: Market
  currency: Currency
  onClose: () => void
}) {
  const { messages } = useI18n()
  const t = messages.billing
  const checkout = useStartCheckout()
  const annual = interval === 'annual'

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const total = priceLabel(market, plan, interval)
  const chargeLine = `${total} ${annual ? t.perYearLong : t.perMonthLong}`
  const savings = formatPrice(annualSavings(market, plan), currency)

  function confirm() {
    checkout.mutate(
      { plan, interval, market },
      { onSuccess: result => (window.location.href = result.url) },
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.subscribePlan.replace('{plan}', planName(plan, messages))}
    >
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className="bg-ink-900/45 absolute inset-0"
      />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-[0_24px_64px_rgba(20,10,60,0.3)] [animation:ld-slide-in_0.2s_cubic-bezier(0.2,0,0,1)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-ink-900 text-lg font-bold">
            {t.subscribePlan.replace('{plan}', planName(plan, messages))}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="bg-bg text-ink-600 flex h-8 w-8 items-center justify-center rounded-full"
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div className="border-line mb-3.5 flex flex-col gap-2 rounded-2xl border p-4">
          <Line label={t.checkoutPlan}>
            {planName(plan, messages)} · {annual ? t.annual : t.monthly}
          </Line>
          <Line label={t.checkoutCharge}>{chargeLine}</Line>
          {annual && (
            <div className="text-success flex justify-between text-[13px] font-medium">
              <span>{t.checkoutSavings}</span>
              <span>{savings}</span>
            </div>
          )}
          <div className="border-line mt-1 flex items-baseline justify-between border-t pt-2.5">
            <span className="text-ink-600 text-sm">{t.checkoutTotal}</span>
            <span className="text-ink-900 text-xl font-extrabold">{total}</span>
          </div>
        </div>

        {checkout.isError && (
          <p className="text-danger mb-2 text-center text-xs">{t.error}</p>
        )}

        <Button
          className="h-12 w-full"
          onClick={confirm}
          isLoading={checkout.isPending}
        >
          {checkout.isPending ? t.processing : t.goToPayment}
        </Button>
        <p className="text-ink-500 mt-3 text-center text-xs leading-relaxed">
          {t.checkoutNote}
        </p>
      </div>
    </div>
  )
}

function Line({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex justify-between text-[13px]', className)}>
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900 font-semibold">{children}</span>
    </div>
  )
}
