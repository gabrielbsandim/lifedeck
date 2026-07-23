'use client'

import { useState } from 'react'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Button } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import {
  useCalendarConnections,
  useDisconnectCalendar,
} from '@/lib/api/use-calendar-connections'
import {
  useStartWhatsappPairing,
  useWhatsappChannel,
} from '@/lib/api/use-pairing'
import { CalendarIcon, CheckSquareIcon } from '@/components/icons'

/** Calendar + WhatsApp connection cards, shared by the onboarding modal and Settings. */
export function ConnectionsPanel() {
  const session = useSession()
  const features = session.data?.features
  return (
    <div className="flex flex-col gap-3">
      {features?.calendar && <CalendarConnect />}
      {features?.whatsapp && <WhatsappConnect />}
    </div>
  )
}

function Row({
  icon,
  done,
  title,
  body,
  children,
}: {
  icon: React.ReactNode
  done?: boolean
  title: string
  body: string
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
          {done ? <CheckSquareIcon size={18} /> : icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-ink-800 text-sm font-semibold">{title}</p>
          <p className="text-ink-500 mt-0.5 text-sm">{body}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function CalendarConnect() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const cal = messages.calendar
  const session = useSession()
  const user = session.data
  const entitled = Boolean(user?.entitlements?.includes('calendarSync'))
  const connections = useCalendarConnections(Boolean(user?.features?.calendar))
  const disconnect = useDisconnectCalendar()
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const list = connections.data ?? []
  const connected = list.length > 0

  return (
    <Row
      icon={<CalendarIcon size={18} />}
      done={connected}
      title={t.calendarTitle}
      body={t.calendarBody}
    >
      {connected ? (
        <div className="flex flex-col gap-2">
          <ul className="divide-line flex flex-col divide-y">
            {list.map(connection => (
              <li key={connection.id} className="flex flex-col gap-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-ink-700 min-w-0 flex-1 truncate text-sm">
                    {connection.accountEmail ?? cal.googleAccount}
                  </span>
                  {confirmingId !== connection.id && (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(connection.id)}
                      className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                    >
                      {cal.disconnectCalendar}
                    </button>
                  )}
                </div>
                {confirmingId === connection.id && (
                  <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5">
                    <p className="text-xs text-red-700">
                      {cal.disconnectConfirm}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          disconnect.mutate(connection.id)
                          setConfirmingId(null)
                        }}
                        disabled={disconnect.isPending}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {cal.disconnectCalendar}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="text-ink-600 px-2 text-xs font-medium hover:underline"
                      >
                        {cal.connect.cancel}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <a
            href="/api/v1/calendar/google/connect"
            className="text-brand-600 self-start text-[13px] font-semibold"
          >
            {cal.addAnotherCalendar}
          </a>
        </div>
      ) : entitled ? (
        <a
          href="/api/v1/calendar/google/connect"
          className="bg-brand-600 hover:bg-brand-700 inline-flex h-9 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold text-white sm:w-fit"
        >
          {t.calendarAction}
        </a>
      ) : (
        <Link
          href="/settings/billing"
          className="border-brand-300 text-brand-700 hover:bg-brand-50 inline-flex h-9 w-full items-center justify-center rounded-lg border px-4 text-sm font-semibold sm:w-fit"
        >
          {t.calendarUpgrade}
        </Link>
      )}
    </Row>
  )
}

/**
 * WhatsApp connect: one tap opens WhatsApp with a ready-to-send, human-readable
 * message (not a bare code), and this card polls the link status so it confirms
 * on its own the moment the user sends it. Three states: idle, waiting, linked.
 */
function WhatsappConnect() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const pairing = useStartWhatsappPairing()
  const channel = useWhatsappChannel(true)

  const linked =
    channel.data?.status === 'linked' || pairing.data?.status === 'linked'
  const code = pairing.data?.code
  const waNumber = pairing.data?.waNumber ?? channel.data?.waNumber ?? null
  const waiting = !linked && Boolean(code)

  const deepLink =
    waNumber && code
      ? `https://wa.me/${waNumber}?text=${encodeURIComponent(
          t.waMessage.replace('{code}', code),
        )}`
      : (pairing.data?.deepLink ?? null)

  return (
    <Row
      icon={<WhatsappGlyph />}
      done={linked}
      title={linked ? t.waConnectedTitle : t.whatsappTitle}
      body={linked ? t.waConnectedBody : t.whatsappBody}
    >
      {linked ? null : waiting ? (
        <div className="flex flex-col gap-3">
          {deepLink && (
            <>
              <a
                href={deepLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                <WhatsappGlyph />
                {t.waOpen}
              </a>
              <div className="flex items-center gap-3">
                <span className="bg-line h-px flex-1" />
                <span className="text-ink-400 text-xs">{t.waOr}</span>
                <span className="bg-line h-px flex-1" />
              </div>
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="border-line rounded-xl border bg-white p-3">
                  <QRCodeSVG value={deepLink} size={148} marginSize={0} />
                </div>
                <p className="text-ink-500 max-w-56 text-center text-xs">
                  {t.waScan}
                </p>
              </div>
            </>
          )}
          <div className="bg-brand-50/60 flex items-start gap-2.5 rounded-lg p-3">
            <Spinner />
            <div className="min-w-0 flex-1">
              <p className="text-ink-800 text-sm font-medium">{t.waWaiting}</p>
              <p className="text-ink-500 mt-0.5 text-xs">{t.waWaitingHint}</p>
            </div>
          </div>
          {code && (
            <div className="border-line flex flex-col gap-1 border-t pt-2.5">
              <p className="text-ink-400 text-xs">{t.waManual}</p>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-ink-500 text-xs">{t.waCodeLabel}</span>
                <span className="text-ink-900 font-mono text-lg font-bold tracking-[0.3em]">
                  {code}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <ol className="text-ink-600 flex flex-col gap-2 text-sm">
            <Step n={1}>{t.waStepA}</Step>
            <Step n={2}>{t.waStepB}</Step>
          </ol>
          <Button
            onClick={() => pairing.mutate(undefined)}
            isLoading={pairing.isPending}
            className="h-11 w-full"
          >
            {t.waConnect}
          </Button>
        </div>
      )}
      {pairing.isError && (
        <p className="text-danger text-xs">{t.whatsappErr}</p>
      )}
    </Row>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="bg-brand-100 text-brand-700 mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold">
        {n}
      </span>
      <span>{children}</span>
    </li>
  )
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="border-brand-200 border-t-brand-600 mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2"
    />
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
