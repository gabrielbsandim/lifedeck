'use client'

import { useState } from 'react'
import { Button } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { useStartWhatsappPairing } from '@/lib/api/use-pairing'
import { PhoneField } from '@/components/phone-field'
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
    <section className="border-line bg-brand-50/50 rounded-2xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-ink-900 text-sm font-semibold">{t.title}</h2>
          <p className="text-ink-500 mt-0.5 text-xs">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.dismiss}
          className="text-ink-400 hover:bg-bg -mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        >
          <CloseIcon size={15} />
        </button>
      </div>

      <div className="border-line divide-line mt-3 divide-y overflow-hidden rounded-xl border bg-white">
        {calendarEnabled && (
          <div className="flex items-center gap-3 p-3">
            <StepIcon done={calendarConnected}>
              <CalendarIcon size={16} />
            </StepIcon>
            <div className="min-w-0 flex-1">
              <p className="text-ink-800 text-sm font-medium">
                {t.calendarTitle}
              </p>
              <p className="text-ink-500 text-xs">{t.calendarBody}</p>
            </div>
            {calendarConnected ? (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {t.calendarConnected}
              </span>
            ) : (
              <a
                href="/api/v1/calendar/google/connect"
                className="bg-brand-600 hover:bg-brand-700 inline-flex h-8 shrink-0 items-center rounded-lg px-3 text-sm font-semibold text-white"
              >
                {t.calendarAction}
              </a>
            )}
          </div>
        )}

        {whatsappEnabled && <WhatsappRow country={user?.country} />}
      </div>
    </section>
  )
}

function StepIcon({
  done,
  children,
}: {
  done?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={
        done
          ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600'
          : 'bg-brand-100 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
      }
    >
      {done ? <CheckSquareIcon size={16} /> : children}
    </span>
  )
}

function WhatsappRow({ country }: { country?: string | null }) {
  const { messages } = useI18n()
  const t = messages.getStarted
  const pairing = useStartWhatsappPairing()
  const [phone, setPhone] = useState('')
  const result = pairing.data

  return (
    <div className="flex flex-col gap-2.5 p-3">
      <div className="flex items-start gap-3">
        <StepIcon>
          <WhatsappGlyph />
        </StepIcon>
        <div className="min-w-0 flex-1">
          <p className="text-ink-800 text-sm font-medium">{t.whatsappTitle}</p>
          <p className="text-ink-500 text-xs">{t.whatsappBody}</p>
        </div>
      </div>

      {result?.deepLink ? (
        <div className="flex flex-col gap-1">
          <a
            href={result.deepLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
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
          className="flex flex-col gap-2"
        >
          <PhoneField
            defaultCountry={country}
            onChange={setPhone}
            placeholder="11 90000-0000"
            disabled={pairing.isPending}
          />
          <Button
            type="submit"
            className="h-9 w-full"
            isLoading={pairing.isPending}
            disabled={!phone.trim()}
          >
            {t.whatsappLink}
          </Button>
        </form>
      )}
      {pairing.isError && (
        <p className="text-danger text-xs">{t.whatsappErr}</p>
      )}
    </div>
  )
}

function WhatsappGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1-.4-.1-.9-.3-1.6-.6-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8 0-1.3.7-2 .9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .5l-.4.6c-.1.2-.3.3-.1.6.1.3.6 1 1.3 1.6.9.8 1.6 1 1.9 1.2.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.6-.1l1.8.9c.3.1.4.2.5.3.1.2.1.7-.1 1.3Z" />
    </svg>
  )
}
