'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Route } from 'next'
import { Badge, Button, Card, Skeleton, TextField } from '@lifedeck/ui'
import type {
  BookableSlotView,
  BookingRequestResult,
  PublicBookingPageView,
} from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { ApiError } from '@/lib/api/client'
import { useRequestBooking } from '@/lib/api/use-public-booking'
import { formatSlotMoment } from '@/lib/booking/slot-days'
import { useViewerTimeZone } from '@/lib/booking/use-viewer-time-zone'
import {
  BookingHeader,
  BookingShell,
  placeLabel,
} from '@/components/booking/booking-page-view'
import { SlotPicker } from '@/components/booking/slot-picker'

type Service = PublicBookingPageView['services'][number]

type Booked = { result: BookingRequestResult; email: string }

export function BookingFlow({
  page,
  service,
}: {
  page: PublicBookingPageView
  service: Service
}) {
  const { messages, locale } = useI18n()
  const t = messages.booking
  const [timeZone, setTimeZone] = useViewerTimeZone()
  const [slot, setSlot] = useState<BookableSlotView | null>(null)
  const [booked, setBooked] = useState<Booked | null>(null)
  const [error, setError] = useState<string | null>(null)
  const request = useRequestBooking(page.slug)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!slot || !timeZone) {
      return
    }
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '').trim()
    const email = field('email')
    setError(null)
    request.mutate(
      {
        serviceId: service.id,
        startsAt: slot.startsAt,
        name: field('name'),
        email,
        phone: field('phone') || null,
        note: field('note') || null,
        timezone: timeZone,
        website: field('website'),
      },
      {
        onSuccess: result => setBooked({ result, email }),
        onError: failure => {
          const taken =
            failure instanceof ApiError && failure.code === 'SLOT_TAKEN'
          setError(taken ? t.slotTaken : t.failed)
          if (taken) {
            setSlot(null)
          }
        },
      },
    )
  }

  if (booked && timeZone) {
    const pending = booked.result.status === 'pending'
    const body = pending ? t.pendingBody : t.confirmedBody
    return (
      <BookingShell t={t}>
        <Card className="flex flex-col gap-4 p-6" role="status">
          <h1 className="text-2xl font-semibold tracking-tight">
            {pending ? t.pendingTitle : t.confirmedTitle}
          </h1>
          <p className="font-medium">
            {t.serviceWith
              .replace('{service}', service.name)
              .replace('{name}', page.displayName)}
          </p>
          <p className="text-ink-600">
            {formatSlotMoment(booked.result.startsAt, locale, timeZone)}
          </p>
          <p className="text-ink-500 text-sm">
            {body
              .replace('{name}', page.displayName)
              .replace('{email}', booked.email)}
          </p>
          <Link
            href={`/b/manage/${booked.result.manageToken}` as Route}
            className="text-brand-accent text-sm font-medium"
          >
            {t.manage}
          </Link>
        </Card>
      </BookingShell>
    )
  }

  return (
    <BookingShell t={t}>
      <BookingHeader page={page} />
      <Card className="flex flex-col gap-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-semibold">{service.name}</h2>
          <Link
            href={`/b/${page.slug}` as Route}
            className="text-brand-accent shrink-0 text-sm"
          >
            {t.back}
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{t.minutes.replace('{n}', String(service.durationMin))}</Badge>
          <Badge>{placeLabel(t, service.locationKind)}</Badge>
          {service.priceLabel && <Badge>{service.priceLabel}</Badge>}
        </div>
      </Card>

      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}

      {!timeZone && <Skeleton className="h-64 w-full rounded-2xl" />}

      {timeZone && !slot && (
        <SlotPicker
          slug={page.slug}
          serviceId={service.id}
          timeZone={timeZone}
          onTimeZoneChange={setTimeZone}
          selected={null}
          onSelect={setSlot}
        />
      )}

      {timeZone && slot && (
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">
              {formatSlotMoment(slot.startsAt, locale, timeZone)}
            </p>
            <Button type="button" variant="ghost" onClick={() => setSlot(null)}>
              {t.back}
            </Button>
          </div>
          <h2 className="text-ink-600 text-sm font-medium">{t.yourDetails}</h2>
          <TextField
            name="name"
            label={t.name}
            required
            maxLength={120}
            autoComplete="name"
          />
          <TextField
            name="email"
            type="email"
            label={t.email}
            required
            maxLength={254}
            autoComplete="email"
          />
          <TextField
            name="phone"
            type="tel"
            label={t.phone}
            maxLength={32}
            autoComplete="tel"
          />
          <TextField name="note" label={t.note} maxLength={1000} />
          <div
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 overflow-hidden"
          >
            <label>
              {t.honeypot}
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <Button type="submit" isLoading={request.isPending}>
            {service.requiresApproval ? t.request : t.book}
          </Button>
        </form>
      )}
    </BookingShell>
  )
}
