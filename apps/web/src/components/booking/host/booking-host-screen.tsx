'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { Card, Skeleton, Tabs } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useBookingSetup } from '@/lib/api/use-booking'
import type { HostCopy } from '@/components/booking/host/fields'
import { SetupWizard } from '@/components/booking/host/setup-wizard'
import { LinkCard } from '@/components/booking/host/link-card'
import { BookingsPanel } from '@/components/booking/host/bookings-panel'
import { ServicesPanel } from '@/components/booking/host/services-panel'
import { HoursPanel } from '@/components/booking/host/hours-panel'
import { ClientsPanel } from '@/components/booking/host/clients-panel'
import { PagePanel } from '@/components/booking/host/page-panel'

type Panel = 'bookings' | 'services' | 'hours' | 'clients' | 'page'

const PANELS: readonly Panel[] = [
  'bookings',
  'services',
  'hours',
  'clients',
  'page',
]

const noSubscription = () => () => {}
const browserOrigin = () => window.location.origin

function BookingUpsell({ t }: { t: HostCopy }) {
  return (
    <div className="from-brand-600 flex flex-col gap-4 rounded-2xl bg-gradient-to-br to-violet-500 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <span className="inline-flex rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {t.upsellBadge}
        </span>
        <h1 className="mt-2 text-[19px] font-bold text-white">
          {t.upsellTitle}
        </h1>
        <p className="mt-1 max-w-md text-[13.5px] leading-snug text-white/85">
          {t.upsellBody}
        </p>
      </div>
      <Link
        href="/settings/billing"
        className="text-brand-700 flex h-10 flex-none items-center justify-center rounded-full bg-white px-5 text-sm font-semibold shadow-md"
      >
        {t.upsellCta}
      </Link>
    </div>
  )
}

export function BookingHostScreen() {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const session = useSession()
  const origin = useSyncExternalStore(noSubscription, browserOrigin, () => '')
  const featureOn = session.data?.features?.booking ?? false
  const entitled = session.data?.entitlements?.includes('booking') ?? false
  const setup = useBookingSetup(featureOn && entitled)
  const [panel, setPanel] = useState<Panel>('bookings')
  const [wizardBusy, setWizardBusy] = useState(false)

  if (session.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }
  if (!featureOn) {
    return null
  }
  if (!entitled) {
    return <BookingUpsell t={t} />
  }
  if (setup.isError) {
    return (
      <Card role="alert" className="p-6 text-center">
        {t.failed}
      </Card>
    )
  }
  if (!setup.data) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }

  const page = setup.data.page
  if (!page || wizardBusy) {
    return (
      <SetupWizard
        defaultName={session.data?.displayName ?? ''}
        origin={origin}
        onBusy={setWizardBusy}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>
      <LinkCard page={page} origin={origin} t={t} />
      <Tabs
        className="flex-wrap"
        value={panel}
        onChange={value => setPanel(value as Panel)}
        tabs={PANELS.map(value => ({ value, label: t.tabs[value] }))}
      />
      {panel === 'bookings' && <BookingsPanel timeZone={page.timezone} />}
      {panel === 'services' && <ServicesPanel services={setup.data.services} />}
      {panel === 'hours' && (
        <HoursPanel setup={setup.data} timeZone={page.timezone} />
      )}
      {panel === 'clients' && <ClientsPanel />}
      {panel === 'page' && <PagePanel page={page} />}
    </div>
  )
}
