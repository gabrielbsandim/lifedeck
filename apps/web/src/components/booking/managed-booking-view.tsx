'use client'

import { useState } from 'react'
import { Badge, Button, Card, Skeleton, TextField } from '@lifedeck/ui'
import type { BookableSlotView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCancelManagedBooking,
  useManagedBooking,
  useRescheduleManagedBooking,
} from '@/lib/api/use-public-booking'
import { formatSlotMoment } from '@/lib/booking/slot-days'
import { useViewerTimeZone } from '@/lib/booking/use-viewer-time-zone'
import {
  BookingShell,
  placeLabel,
} from '@/components/booking/booking-page-view'
import { SlotPicker } from '@/components/booking/slot-picker'

type Mode = 'view' | 'cancel' | 'reschedule'

const HOLDING = new Set(['pending', 'confirmed'])

export function ManagedBookingView({ token }: { token: string }) {
  const { messages, locale } = useI18n()
  const t = messages.booking
  const booking = useManagedBooking(token)
  const [timeZone, setTimeZone] = useViewerTimeZone(
    booking.data?.clientTimezone,
  )
  const [mode, setMode] = useState<Mode>('view')
  const [slot, setSlot] = useState<BookableSlotView | null>(null)
  const [reason, setReason] = useState('')
  const [changed, setChanged] = useState(false)
  const cancel = useCancelManagedBooking(token)
  const reschedule = useRescheduleManagedBooking(token)
  const done = () => {
    setMode('view')
    setSlot(null)
    setChanged(true)
  }

  if (booking.isPending || !timeZone) {
    return (
      <BookingShell t={t}>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </BookingShell>
    )
  }

  if (booking.isError) {
    return (
      <BookingShell t={t}>
        <Card className="p-6 text-center" role="alert">
          {t.linkInvalid}
        </Card>
      </BookingShell>
    )
  }

  const view = booking.data
  const failed = cancel.isError || reschedule.isError

  return (
    <BookingShell t={t}>
      <header className="flex flex-col gap-2">
        <p className="text-ink-500 text-sm">{t.manageTitle}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t.serviceWith
            .replace('{service}', view.serviceName)
            .replace('{name}', view.hostName)}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Badge tone={view.status === 'confirmed' ? 'success' : 'neutral'}>
            {t.status[view.status]}
          </Badge>
          <Badge>{t.minutes.replace('{n}', String(view.durationMin))}</Badge>
          <Badge>{placeLabel(t, view.location.kind)}</Badge>
        </div>
      </header>

      <Card className="p-5">
        <p className="font-medium">
          {formatSlotMoment(view.startsAt, locale, timeZone)}
        </p>
      </Card>

      {changed && (
        <p role="status" className="text-success text-sm">
          {t.changed}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-danger text-sm">
          {t.failed}
        </p>
      )}

      {!view.canChange && HOLDING.has(view.status) && (
        <p className="text-ink-500 text-sm">
          {t.tooLate.replace('{name}', view.hostName)}
        </p>
      )}

      {view.canChange && mode === 'view' && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => setMode('reschedule')}>{t.reschedule}</Button>
          <Button variant="ghost" onClick={() => setMode('cancel')}>
            {t.cancel}
          </Button>
        </div>
      )}

      {view.canChange && mode === 'cancel' && (
        <div className="flex flex-col gap-3">
          <TextField
            label={t.cancelReason}
            value={reason}
            maxLength={1000}
            onChange={event => setReason(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              isLoading={cancel.isPending}
              onClick={() =>
                cancel.mutate(
                  { reason: reason.trim() || null },
                  { onSuccess: done },
                )
              }
            >
              {t.cancelConfirm}
            </Button>
            <Button variant="ghost" onClick={() => setMode('view')}>
              {t.keep}
            </Button>
          </div>
        </div>
      )}

      {view.canChange && mode === 'reschedule' && (
        <div className="flex flex-col gap-4">
          <SlotPicker
            slug={view.slug}
            serviceId={view.serviceId}
            timeZone={timeZone}
            onTimeZoneChange={setTimeZone}
            selected={slot?.startsAt ?? null}
            onSelect={setSlot}
          />
          <div className="flex gap-2">
            <Button
              disabled={!slot}
              isLoading={reschedule.isPending}
              onClick={() =>
                slot &&
                reschedule.mutate(
                  { startsAt: slot.startsAt },
                  { onSuccess: done },
                )
              }
            >
              {slot
                ? t.rescheduleConfirm.replace(
                    '{time}',
                    formatSlotMoment(slot.startsAt, locale, timeZone),
                  )
                : t.reschedule}
            </Button>
            <Button variant="ghost" onClick={() => setMode('view')}>
              {t.keep}
            </Button>
          </div>
        </div>
      )}
    </BookingShell>
  )
}
