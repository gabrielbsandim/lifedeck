// RN port of apps/web/src/components/booking/host/bookings-panel.tsx: requests
// to approve, upcoming and past bookings, with approve, decline, cancel and the
// "how did it go" outcome. Keep the two in sync.
import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import type { BookingView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Skeleton,
  Tabs,
  TextField,
} from '@/components/ui'
import {
  useBookingAction,
  useBookings,
  type BookingAction,
} from '@/lib/api/use-booking'
import {
  formatSlotMoment,
  needsOutcome,
  partitionBookings,
} from '@/lib/booking/host'
import { useI18n } from '@/lib/i18n/messages-provider'

type Bucket = 'pending' | 'upcoming' | 'past'
type Asking = { booking: BookingView; kind: 'decline' | 'cancel' } | null
type HostCopy = Messages['bookingHost']
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
  busy,
  onAction,
  onAsk,
}: {
  booking: BookingView
  timeZone: string
  now: Date
  busy: boolean
  onAction: (action: BookingAction) => void
  onAsk: (kind: 'decline' | 'cancel') => void
}) {
  const { messages, locale } = useI18n()
  const t = messages.bookingHost
  const client = booking.client
  const outcome = needsOutcome(booking, now)
  const source = Object.hasOwn(t.bookings.fromSource, booking.source)
    ? t.bookings.fromSource[booking.source as SourceKey]
    : booking.source
  return (
    <Card className="gap-3 p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-ink-900 font-semibold">
            {formatSlotMoment(booking.startsAt, locale, timeZone)}
          </Text>
          <Text className="text-ink-600 text-sm" numberOfLines={1}>
            {[booking.serviceName, client?.name].filter(Boolean).join(' · ')}
          </Text>
          {client ? (
            <Text className="text-ink-500 text-xs" numberOfLines={1}>
              {[client.email, client.phone].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
        <Badge tone={STATUS_TONE[booking.status]}>
          {messages.booking.status[booking.status]}
        </Badge>
      </View>
      {booking.note ? (
        <Text className="text-ink-600 bg-bg rounded-lg p-2 text-sm">
          {booking.note}
        </Text>
      ) : null}
      {booking.cancelReason ? (
        <Text className="text-ink-500 text-sm">{booking.cancelReason}</Text>
      ) : null}
      <Text className="text-ink-400 text-xs">{source}</Text>
      {booking.status === 'pending' ? (
        <View className="flex-row flex-wrap gap-2">
          <Button
            isLoading={busy}
            onPress={() => onAction({ kind: 'confirm' })}
          >
            {t.bookings.confirm}
          </Button>
          <Button variant="ghost" onPress={() => onAsk('decline')}>
            {t.bookings.decline}
          </Button>
        </View>
      ) : null}
      {booking.status === 'confirmed' && !outcome ? (
        <Button
          variant="ghost"
          className="self-start"
          onPress={() => onAsk('cancel')}
        >
          {t.bookings.cancel}
        </Button>
      ) : null}
      {outcome ? (
        <View className="gap-2">
          <Text className="text-ink-600 text-sm">{t.bookings.outcomeAsk}</Text>
          <View className="flex-row flex-wrap gap-2">
            <Button
              isLoading={busy}
              onPress={() =>
                onAction({ kind: 'outcome', outcome: 'completed' })
              }
            >
              {t.bookings.completed}
            </Button>
            <Button
              variant="ghost"
              onPress={() => onAction({ kind: 'outcome', outcome: 'no_show' })}
            >
              {t.bookings.noShow}
            </Button>
          </View>
        </View>
      ) : null}
    </Card>
  )
}

export function BookingsList({ timeZone }: { timeZone: string }) {
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
  if (bookings.isError) {
    return (
      <Card className="items-center gap-3 py-8">
        <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
        <Button onPress={() => bookings.refetch()}>
          {messages.common.retry}
        </Button>
      </Card>
    )
  }

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
  const list = buckets[bucket]
  const failed = action.isError ? t.failed : undefined

  return (
    <View className="gap-3">
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
      {failed && !asking ? (
        <Text className="text-danger text-sm">{failed}</Text>
      ) : null}
      {list.length === 0 ? <EmptyState title={t.bookings.empty} /> : null}
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
        {asking ? (
          <View className="gap-3">
            <TextField
              label={t.bookings.reason}
              multiline
              maxLength={1000}
              value={reason}
              onChangeText={setReason}
              className="min-h-24"
            />
            {failed ? (
              <Text className="text-danger text-sm">{failed}</Text>
            ) : null}
            <View className="flex-row gap-2">
              <Button
                isLoading={action.isPending}
                onPress={() =>
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
              <Button variant="ghost" onPress={() => setAsking(null)}>
                {t.cancel}
              </Button>
            </View>
          </View>
        ) : null}
      </Dialog>
    </View>
  )
}
