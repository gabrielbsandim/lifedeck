'use client'

import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
  Tabs,
} from '@lifedeck/ui'
import type { BookingView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useBookingAction,
  useBookings,
  type BookingAction,
} from '@/lib/api/use-booking'
import { formatSlotMoment } from '@/lib/booking/slot-days'
import { needsOutcome, partitionBookings } from '@/lib/booking/host'
import {
  FormError,
  errorMessage,
  type HostCopy,
} from '@/components/booking/host/fields'

type Bucket = 'pending' | 'upcoming' | 'past'
type Asking = { booking: BookingView; kind: 'decline' | 'cancel' } | null
type SourceKey = keyof HostCopy['bookings']['fromSource']

const DAY_MS = 86_400_000

const STATUS_TONE: Record<
  BookingView['status'],
  'neutral' | 'brand' | 'success'
> = {
  pending: 'brand',
  confirmed: 'success',
  completed: 'success',
  cancelled: 'neutral',
  declined: 'neutral',
  no_show: 'neutral',
}

function BookingCard({
  booking,
  timeZone,
  now,
  onAction,
  onAsk,
  busy,
}: {
  booking: BookingView
  timeZone: string
  now: Date
  onAction: (action: BookingAction) => void
  onAsk: (kind: 'decline' | 'cancel') => void
  busy: boolean
}) {
  const { messages, locale } = useI18n()
  const t: HostCopy = messages.bookingHost
  const client = booking.client
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">
            {formatSlotMoment(booking.startsAt, locale, timeZone)}
          </p>
          <p className="text-ink-600 truncate text-sm">
            {[booking.serviceName, client?.name].filter(Boolean).join(' · ')}
          </p>
          {client && (
            <p className="text-ink-500 truncate text-xs">
              {[client.email, client.phone].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <Badge tone={STATUS_TONE[booking.status]}>
          {messages.booking.status[booking.status]}
        </Badge>
      </div>
      {booking.note && (
        <p className="text-ink-600 bg-bg rounded-lg p-2 text-sm">
          {booking.note}
        </p>
      )}
      {booking.cancelReason && (
        <p className="text-ink-500 text-sm">{booking.cancelReason}</p>
      )}
      <p className="text-ink-400 text-xs">
        {Object.hasOwn(t.bookings.fromSource, booking.source)
          ? t.bookings.fromSource[booking.source as SourceKey]
          : booking.source}
      </p>
      {booking.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          <Button
            isLoading={busy}
            onClick={() => onAction({ kind: 'confirm' })}
          >
            {t.bookings.confirm}
          </Button>
          <Button variant="ghost" onClick={() => onAsk('decline')}>
            {t.bookings.decline}
          </Button>
        </div>
      )}
      {booking.status === 'confirmed' && !needsOutcome(booking, now) && (
        <Button
          variant="ghost"
          className="self-start"
          onClick={() => onAsk('cancel')}
        >
          {t.bookings.cancel}
        </Button>
      )}
      {needsOutcome(booking, now) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-ink-600 text-sm">{t.bookings.outcomeAsk}</span>
          <Button
            isLoading={busy}
            onClick={() => onAction({ kind: 'outcome', outcome: 'completed' })}
          >
            {t.bookings.completed}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onAction({ kind: 'outcome', outcome: 'no_show' })}
          >
            {t.bookings.noShow}
          </Button>
        </div>
      )}
    </Card>
  )
}

export function BookingsPanel({ timeZone }: { timeZone: string }) {
  const { messages } = useI18n()
  const t = messages.bookingHost
  const [now] = useState(() => new Date())
  const query = useMemo(
    () => ({
      from: new Date(now.getTime() - 60 * DAY_MS).toISOString(),
      to: new Date(now.getTime() + 180 * DAY_MS).toISOString(),
    }),
    [now],
  )
  const bookings = useBookings(query)
  const action = useBookingAction()
  const [asking, setAsking] = useState<Asking>(null)
  const [reason, setReason] = useState('')
  const buckets = useMemo(
    () => partitionBookings(bookings.data ?? [], now),
    [bookings.data, now],
  )
  const [chosen, setChosen] = useState<Bucket | null>(null)
  const bucket = chosen ?? (buckets.pending.length > 0 ? 'pending' : 'upcoming')

  if (bookings.isPending) {
    return <Skeleton className="h-48 w-full rounded-2xl" />
  }

  const list = buckets[bucket]
  const run = (booking: BookingView, next: BookingAction) =>
    action.mutate(
      { id: booking.id, action: next },
      {
        onSuccess: () => {
          setAsking(null)
          setReason('')
        },
      },
    )

  return (
    <div className="flex flex-col gap-3">
      <Tabs
        value={bucket}
        onChange={value => setChosen(value as Bucket)}
        tabs={[
          {
            value: 'pending',
            label:
              buckets.pending.length > 0
                ? `${t.bookings.pending} (${buckets.pending.length})`
                : t.bookings.pending,
          },
          { value: 'upcoming', label: t.bookings.upcoming },
          { value: 'past', label: t.bookings.past },
        ]}
      />
      {!asking && <FormError message={errorMessage(action.error, t.failed)} />}
      {list.length === 0 && <EmptyState title={t.bookings.empty} />}
      {list.map(booking => (
        <BookingCard
          key={booking.id}
          booking={booking}
          timeZone={timeZone}
          now={now}
          busy={action.isPending && action.variables?.id === booking.id}
          onAction={next => run(booking, next)}
          onAsk={kind => {
            action.reset()
            setAsking({ booking, kind })
          }}
        />
      ))}

      <Dialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={
          asking?.kind === 'decline' ? t.bookings.decline : t.bookings.cancel
        }
      >
        {asking && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-ink-700 font-medium">
                {t.bookings.reason}
              </span>
              <textarea
                className="border-line focus-visible:border-brand-600 bg-surface min-h-24 rounded-xl border-[1.5px] p-3 text-sm outline-none"
                maxLength={1000}
                value={reason}
                onChange={event => setReason(event.target.value)}
              />
            </label>
            <FormError message={errorMessage(action.error, t.failed)} />
            <div className="flex gap-2">
              <Button
                isLoading={action.isPending}
                onClick={() =>
                  run(asking.booking, {
                    kind: asking.kind,
                    reason: reason.trim() || null,
                  })
                }
              >
                {asking.kind === 'decline'
                  ? t.bookings.decline
                  : t.bookings.cancel}
              </Button>
              <Button variant="ghost" onClick={() => setAsking(null)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
