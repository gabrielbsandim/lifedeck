'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, TextField } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { useStartWhatsappPairing } from '@/lib/api/use-pairing'
import { CalendarIcon, CheckSquareIcon, CloseIcon } from '@/components/icons'

const DISMISS_KEY = 'ld:get-started-dismissed'

export function GetStartedPanel() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const session = useSession()
  const user = session.data
  const registered = Boolean(user && !user.isGuest && user.email !== null)
  const features = user?.features
  const calendarEnabled = registered && Boolean(features?.calendar)
  const whatsappEnabled = registered && Boolean(features?.whatsapp)

  const connections = useCalendarConnections(calendarEnabled)
  const calendarConnected = (connections.data?.length ?? 0) > 0

  // The panel only mounts client-side (after the session query resolves), so
  // reading localStorage in the initializer is safe and avoids a setState effect.
  const [dismissed, setDismissed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.localStorage.getItem(DISMISS_KEY) === '1',
  )

  const dismiss = () => {
    if (typeof window !== 'undefined')
      window.localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  const calendarPending = calendarEnabled && !calendarConnected
  const visible =
    registered && !dismissed && (calendarPending || whatsappEnabled)
  if (!visible) return null

  return (
    <section className="border-line bg-brand-50/40 flex flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-ink-900 text-base font-semibold">{t.title}</h2>
          <p className="text-ink-500 mt-0.5 text-sm">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="text-ink-400 hover:bg-bg -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full"
        >
          <CloseIcon size={16} />
        </button>
      </div>

      {calendarEnabled && (
        <StepCard
          icon={<CalendarIcon size={20} />}
          title={t.calendarTitle}
          body={t.calendarBody}
          done={calendarConnected}
          doneLabel={t.calendarConnected}
        >
          {!calendarConnected && (
            <Link
              href="/calendar"
              className="bg-brand-600 hover:bg-brand-700 inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white"
            >
              {t.calendarAction}
            </Link>
          )}
        </StepCard>
      )}

      {whatsappEnabled && <WhatsappStep />}
    </section>
  )
}

function StepCard({
  icon,
  title,
  body,
  done,
  doneLabel,
  children,
}: {
  icon: React.ReactNode
  title: string
  body: string
  done?: boolean
  doneLabel?: string
  children?: React.ReactNode
}) {
  return (
    <div className="border-line flex flex-col gap-3 rounded-xl border bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className={
            done
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600'
              : 'bg-brand-100 text-brand-600 flex h-9 w-9 shrink-0 items-center justify-center rounded-full'
          }
        >
          {done ? <CheckSquareIcon size={20} /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-ink-800 text-sm font-semibold">{title}</p>
            {done && doneLabel && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {doneLabel}
              </span>
            )}
          </div>
          <p className="text-ink-500 mt-0.5 text-sm">{body}</p>
        </div>
      </div>
      {children && <div className="pl-12">{children}</div>}
    </div>
  )
}

function WhatsappStep() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const pairing = useStartWhatsappPairing()
  const [phone, setPhone] = useState('')
  const result = pairing.data

  return (
    <StepCard
      icon={<WhatsappGlyph />}
      title={t.whatsappTitle}
      body={t.whatsappBody}
    >
      {result?.deepLink ? (
        <div className="flex flex-col gap-2">
          <a
            href={result.deepLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <WhatsappGlyph />
            {t.whatsappOpen}
          </a>
          <p className="text-ink-500 text-xs">{t.whatsappHint}</p>
        </div>
      ) : (
        <form
          onSubmit={event => {
            event.preventDefault()
            if (phone.trim()) pairing.mutate(phone.trim())
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <TextField
              value={phone}
              onChange={event => setPhone(event.target.value)}
              label={t.whatsappPhone}
              inputMode="tel"
              placeholder="+55 11 90000-0000"
            />
          </div>
          <Button
            type="submit"
            className="h-9"
            isLoading={pairing.isPending}
            disabled={!phone.trim()}
          >
            {t.whatsappLink}
          </Button>
        </form>
      )}
      {pairing.isError && (
        <p className="text-danger mt-2 text-xs">{t.whatsappErr}</p>
      )}
    </StepCard>
  )
}

function WhatsappGlyph() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  )
}
