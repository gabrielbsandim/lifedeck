'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { Badge, Card } from '@lifedeck/ui'
import type { PublicBookingPageView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'

type BookingCopy = Messages['booking']
type PlaceKind = keyof BookingCopy['places']

export function placeLabel(t: BookingCopy, kind: string): string {
  return Object.hasOwn(t.places, kind) ? t.places[kind as PlaceKind] : kind
}

export function BookingShell({
  t,
  children,
}: {
  t: BookingCopy
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-4 py-10 sm:py-16">
      {children}
      <p className="text-ink-400 mt-auto text-center text-xs">{t.poweredBy}</p>
    </main>
  )
}

export function BookingHeader({
  page,
}: {
  page: Pick<PublicBookingPageView, 'displayName' | 'headline'>
}) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold tracking-tight">
        {page.displayName}
      </h1>
      {page.headline && <p className="text-ink-500">{page.headline}</p>}
    </header>
  )
}

export function BookingPageView({
  page,
  t,
}: {
  page: PublicBookingPageView
  t: BookingCopy
}) {
  return (
    <BookingShell t={t}>
      <BookingHeader page={page} />
      <section className="flex flex-col gap-3" aria-labelledby="services">
        <h2 id="services" className="text-ink-600 text-sm font-medium">
          {t.chooseService}
        </h2>
        {page.services.map(service => (
          <Link
            key={service.id}
            href={`/b/${page.slug}/${service.id}` as Route}
            className="focus-visible:ring-brand-600/30 rounded-2xl outline-none focus-visible:ring-4"
          >
            <Card className="hover:border-brand-600 flex flex-col gap-2 p-5 transition">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold">{service.name}</h3>
                {service.priceLabel && (
                  <span className="text-ink-600 shrink-0 text-sm">
                    {service.priceLabel}
                  </span>
                )}
              </div>
              {service.description && (
                <p className="text-ink-500 line-clamp-3 text-sm">
                  {service.description}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {t.minutes.replace('{n}', String(service.durationMin))}
                </Badge>
                <Badge>{placeLabel(t, service.locationKind)}</Badge>
                {service.requiresApproval && (
                  <Badge tone="brand">{t.needsApproval}</Badge>
                )}
              </div>
            </Card>
          </Link>
        ))}
      </section>
    </BookingShell>
  )
}
