'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { SubscriptionView } from '@lifedeck/application'
import { Button, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { apiRequest } from '@/lib/api/client'
import { useStartCheckout } from '@/lib/api/use-checkout'
import { useLocalCheckout } from '@/lib/api/use-local-checkout'
import { sessionKey } from '@/lib/api/use-session'
import { subscriptionKey } from '@/lib/api/use-subscription'
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
import { SegmentedControl } from '@/components/settings/settings-ui'
import { CheckIcon, CloseIcon } from '@/components/icons'

const inputCls =
  'border-line text-ink-800 focus:border-brand-300 h-[46px] w-full rounded-xl border bg-white px-3.5 text-[15px] outline-none'

type Phase = 'form' | 'pix' | 'card'

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
  const isBR = market === 'BR'
  const annual = interval === 'annual'
  const total = priceLabel(market, plan, interval)
  const name = planName(plan, messages)

  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<Phase>('form')
  const [method, setMethod] = useState<'pix' | 'card'>('pix')
  const [pix, setPix] = useState<{
    encodedImage: string
    payload: string
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    cpf: '',
    holderName: '',
    number: '',
    expiryMonth: '',
    expiryYear: '',
    ccv: '',
    postalCode: '',
    addressNumber: '',
    phone: '',
  })

  const intl = useStartCheckout()
  const local = useLocalCheckout()

  // Once a payment has been started, poll the subscription until the provider
  // webhook flips it to active. Success is DERIVED from the poll (not stored),
  // so the effect only runs cache-invalidation side effects, never setState.
  const polling = phase !== 'form'
  const activation = useQuery({
    queryKey: ['billing-activation'],
    queryFn: () =>
      apiRequest<{ subscription: SubscriptionView | null }>(
        '/api/v1/billing/subscription',
      ),
    enabled: polling,
    refetchInterval: query =>
      query.state.data?.subscription?.status === 'active' ? false : 3000,
  })
  const success = polling && activation.data?.subscription?.status === 'active'

  useEffect(() => {
    if (success) {
      void queryClient.invalidateQueries({ queryKey: sessionKey })
      void queryClient.invalidateQueries({ queryKey: subscriptionKey })
    }
  }, [success, queryClient])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key: keyof typeof form) => (value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  function goToHostedCheckout() {
    intl.mutate(
      { plan, interval, market },
      { onSuccess: result => (window.location.href = result.url) },
    )
  }

  function submit() {
    if (method === 'pix') {
      local.mutate(
        { method: 'pix', plan, interval, cpfCnpj: form.cpf },
        {
          onSuccess: result => {
            if (result.method === 'pix') {
              setPix({
                encodedImage: result.encodedImage,
                payload: result.payload,
              })
              setPhase('pix')
            }
          },
        },
      )
      return
    }
    local.mutate(
      {
        method: 'card',
        plan,
        interval,
        cpfCnpj: form.cpf,
        card: {
          holderName: form.holderName,
          number: form.number.replace(/\s/g, ''),
          expiryMonth: form.expiryMonth,
          expiryYear: form.expiryYear,
          ccv: form.ccv,
        },
        postalCode: form.postalCode,
        addressNumber: form.addressNumber,
        phone: form.phone || undefined,
      },
      {
        onSuccess: () => {
          setPhase('card')
        },
      },
    )
  }

  async function copyPix() {
    if (!pix) {
      return
    }
    try {
      await navigator.clipboard.writeText(pix.payload)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard may be unavailable; the code is still visible to copy */
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t.subscribePlan.replace('{plan}', name)}
    >
      <button
        type="button"
        aria-label={t.close}
        onClick={onClose}
        className="bg-ink-900/45 absolute inset-0"
      />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-[0_24px_64px_rgba(20,10,60,0.3)] [animation:ld-slide-in_0.2s_cubic-bezier(0.2,0,0,1)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-ink-900 text-lg font-bold">
            {success
              ? t.activatedTitle
              : t.subscribePlan.replace('{plan}', name)}
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

        {success ? (
          <Success
            body={t.activatedBody.replace('{plan}', name)}
            close={t.close}
            onClose={onClose}
          />
        ) : (
          <>
            <div className="border-line mb-4 flex items-center justify-between rounded-2xl border p-4">
              <div>
                <div className="text-ink-900 text-sm font-semibold">
                  {name} · {annual ? t.annual : t.monthly}
                </div>
                {annual && (
                  <div className="text-success text-xs font-medium">
                    {t.checkoutSavings}:{' '}
                    {formatPrice(annualSavings(market, plan), currency)}
                  </div>
                )}
              </div>
              <span className="text-ink-900 text-xl font-extrabold">
                {total}
              </span>
            </div>

            {!isBR ? (
              <>
                <Button
                  className="h-12 w-full"
                  onClick={goToHostedCheckout}
                  isLoading={intl.isPending}
                >
                  {intl.isPending ? t.processing : t.goToPayment}
                </Button>
                {intl.isError && (
                  <p className="text-danger mt-2 text-center text-xs">
                    {t.error}
                  </p>
                )}
                <p className="text-ink-500 mt-3 text-center text-xs leading-relaxed">
                  {t.checkoutNote}
                </p>
              </>
            ) : phase === 'pix' && pix ? (
              <PixView
                pix={pix}
                copied={copied}
                onCopy={copyPix}
                messages={t}
              />
            ) : phase === 'card' ? (
              <Awaiting label={t.awaitingPayment} />
            ) : (
              <>
                <SegmentedControl
                  className="mb-4"
                  value={method}
                  onChange={setMethod}
                  options={[
                    { value: 'pix', label: t.payWithPix },
                    { value: 'card', label: t.payWithCard },
                  ]}
                />
                <div className="flex flex-col gap-2.5">
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    placeholder={t.cpfLabel}
                    aria-label={t.cpfLabel}
                    value={form.cpf}
                    onChange={e => set('cpf')(e.target.value)}
                  />
                  {method === 'card' && (
                    <>
                      <input
                        className={inputCls}
                        placeholder={t.cardHolder}
                        aria-label={t.cardHolder}
                        value={form.holderName}
                        onChange={e => set('holderName')(e.target.value)}
                      />
                      <input
                        className={inputCls}
                        inputMode="numeric"
                        placeholder={t.cardNumber}
                        aria-label={t.cardNumber}
                        value={form.number}
                        onChange={e => set('number')(e.target.value)}
                      />
                      <div className="flex gap-2.5">
                        <input
                          className={inputCls}
                          inputMode="numeric"
                          placeholder="MM"
                          aria-label={t.cardExpiry}
                          maxLength={2}
                          value={form.expiryMonth}
                          onChange={e => set('expiryMonth')(e.target.value)}
                        />
                        <input
                          className={inputCls}
                          inputMode="numeric"
                          placeholder="AAAA"
                          aria-label={t.cardExpiry}
                          maxLength={4}
                          value={form.expiryYear}
                          onChange={e => set('expiryYear')(e.target.value)}
                        />
                        <input
                          className={inputCls}
                          inputMode="numeric"
                          placeholder={t.cardCvv}
                          aria-label={t.cardCvv}
                          maxLength={4}
                          value={form.ccv}
                          onChange={e => set('ccv')(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2.5">
                        <input
                          className={inputCls}
                          inputMode="numeric"
                          placeholder={t.postalCodeLabel}
                          aria-label={t.postalCodeLabel}
                          value={form.postalCode}
                          onChange={e => set('postalCode')(e.target.value)}
                        />
                        <input
                          className={inputCls}
                          placeholder={t.addressNumberLabel}
                          aria-label={t.addressNumberLabel}
                          value={form.addressNumber}
                          onChange={e => set('addressNumber')(e.target.value)}
                        />
                      </div>
                      <input
                        className={inputCls}
                        inputMode="tel"
                        placeholder={t.phoneOptional}
                        aria-label={t.phoneOptional}
                        value={form.phone}
                        onChange={e => set('phone')(e.target.value)}
                      />
                    </>
                  )}
                </div>
                {local.isError && (
                  <p className="text-danger mt-2 text-center text-xs">
                    {t.error}
                  </p>
                )}
                <Button
                  className="mt-4 h-12 w-full"
                  onClick={submit}
                  isLoading={local.isPending}
                  disabled={!form.cpf}
                >
                  {method === 'pix' ? t.generatePix : t.payNow}
                </Button>
                <p className="text-ink-500 mt-3 text-center text-xs leading-relaxed">
                  {t.footerCancel}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function PixView({
  pix,
  copied,
  onCopy,
  messages,
}: {
  pix: { encodedImage: string; payload: string }
  copied: boolean
  onCopy: () => void
  messages: {
    pixInstructions: string
    copyCode: string
    copied: string
    awaitingPayment: string
  }
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-ink-600 text-center text-sm">
        {messages.pixInstructions}
      </p>
      <div className="border-line rounded-2xl border p-3">
        <Image
          src={`data:image/png;base64,${pix.encodedImage}`}
          alt="Pix QR code"
          width={200}
          height={200}
          className="h-[200px] w-[200px]"
          unoptimized
        />
      </div>
      <button
        type="button"
        onClick={onCopy}
        className="border-line text-ink-700 hover:bg-bg w-full truncate rounded-xl border px-4 py-3 text-center text-sm font-semibold"
      >
        {copied ? messages.copied : messages.copyCode}
      </button>
      <Awaiting label={messages.awaitingPayment} />
    </div>
  )
}

function Awaiting({ label }: { label: string }) {
  return (
    <div className="text-ink-500 mt-2 flex items-center justify-center gap-2.5 text-sm">
      <span className="border-brand-200 border-t-brand-600 h-4 w-4 animate-spin rounded-full border-2" />
      {label}
    </div>
  )
}

function Success({
  body,
  close,
  onClose,
}: {
  body: string
  close: string
  onClose: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-2 text-center">
      <span className="bg-success flex h-[76px] w-[76px] items-center justify-center rounded-full text-white shadow-lg [animation:ld-pop_0.5s_cubic-bezier(0.34,1.56,0.64,1)]">
        <CheckIcon size={38} />
      </span>
      <p className="text-ink-600 max-w-[18rem] text-sm leading-relaxed">
        {body}
      </p>
      <Button className={cn('h-11 w-full')} onClick={onClose}>
        {close}
      </Button>
    </div>
  )
}
