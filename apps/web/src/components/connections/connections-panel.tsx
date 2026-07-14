'use client'

import Link from 'next/link'
import { Button } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useCalendarConnections } from '@/lib/api/use-calendar-connections'
import { useStartWhatsappPairing } from '@/lib/api/use-pairing'
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

/** Titled Connections block for the Settings page; hidden if no channel is enabled. */
export function ConnectionsSection() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const session = useSession()
  const features = session.data?.features
  if (!features?.calendar && !features?.whatsapp) return null
  return (
    <div className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-ink-900 text-sm font-semibold">
          {t.connectionsTitle}
        </h2>
        <p className="text-ink-500 text-xs">{t.connectionsHint}</p>
      </div>
      <ConnectionsPanel />
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
  const session = useSession()
  const user = session.data
  const entitled = Boolean(user?.entitlements?.includes('calendarSync'))
  const connections = useCalendarConnections(Boolean(user?.features?.calendar))
  const connected = (connections.data?.length ?? 0) > 0

  return (
    <Row
      icon={<CalendarIcon size={18} />}
      done={connected}
      title={t.calendarTitle}
      body={t.calendarBody}
    >
      {connected ? (
        <span className="w-fit rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          {t.calendarConnected}
        </span>
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

function WhatsappConnect() {
  const { messages } = useI18n()
  const t = messages.getStarted
  const pairing = useStartWhatsappPairing()
  const result = pairing.data
  const linked = result?.status === 'linked'

  return (
    <Row
      icon={<WhatsappGlyph />}
      done={linked}
      title={linked ? t.waConnectedTitle : t.whatsappTitle}
      body={linked ? t.waConnectedBody : t.whatsappBody}
    >
      {linked ? null : result?.deepLink ? (
        <div className="flex flex-col gap-2">
          <a
            href={result.deepLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <WhatsappGlyph />
            {t.whatsappOpen}
          </a>
          {result.code && (
            <p className="text-ink-500 text-xs">
              {t.waCodeLabel}{' '}
              <span className="text-ink-800 font-mono font-semibold tracking-wider">
                {result.code}
              </span>
            </p>
          )}
          <p className="text-ink-500 text-xs">{t.whatsappHint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <ol className="text-ink-600 flex flex-col gap-1.5 text-xs">
            <Step n={1}>{t.waStep1}</Step>
            <Step n={2}>{t.waStep2}</Step>
            <Step n={3}>{t.waStep3}</Step>
          </ol>
          <Button
            onClick={() => pairing.mutate(undefined)}
            isLoading={pairing.isPending}
            className="h-10 w-full"
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
    <li className="flex items-start gap-2">
      <span className="bg-brand-100 text-brand-700 mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold">
        {n}
      </span>
      <span>{children}</span>
    </li>
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
