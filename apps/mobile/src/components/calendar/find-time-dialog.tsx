// RN port of apps/web/src/components/calendar/find-time-dialog.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { FreeSlotView } from '@lifedeck/application'
import { Button, Dialog } from '@/components/ui'
import type { CalendarRange } from '@/lib/calendar/calendar-view'
import { useCreateCalendarEvent } from '@/lib/api/use-calendar-events'
import { useFindTime } from '@/lib/api/use-find-time'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'

const DURATION_OPTIONS = [30, 60, 90, 120]
const WINDOW_DAYS = 7

export function FindTimeDialog({
  open,
  onClose,
  range,
  timeZone,
  locale,
}: {
  open: boolean
  onClose: () => void
  range: CalendarRange
  timeZone: string
  locale: string
}) {
  const { messages } = useI18n()
  const t = messages.calendar.findTime

  const [durationMin, setDurationMin] = useState(60)
  const findTime = useFindTime()
  const book = useCreateCalendarEvent(range)
  const slots: FreeSlotView[] = findTime.data ?? []

  const formatSlot = (iso: string): string =>
    new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(new Date(iso))

  function search() {
    const now = new Date()
    const to = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000)
    findTime.mutate({
      durationMin,
      from: now.toISOString(),
      to: to.toISOString(),
    })
  }

  function bookSlot(slot: FreeSlotView) {
    book.mutate(
      {
        title: t.defaultTitle,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        reminders: [10],
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Dialog open={open} onClose={onClose} title={t.title} variant="sheet">
      <View className="gap-4">
        <Text className="text-ink-500 text-sm">{t.hint}</Text>

        <View className="gap-1.5">
          <Text className="text-ink-700 text-sm font-medium">{t.duration}</Text>
          <View className="flex-row flex-wrap gap-2">
            {DURATION_OPTIONS.map(option => {
              const active = option === durationMin
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setDurationMin(option)
                    // Drop slots found for the previous duration so a user
                    // can't book an old-length block after changing it.
                    findTime.reset()
                  }}
                  className={cn(
                    'h-10 justify-center rounded-xl border px-4',
                    active
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-line bg-surface',
                  )}
                >
                  <Text
                    className={cn(
                      'text-sm font-semibold',
                      active ? 'text-white' : 'text-ink-700',
                    )}
                  >
                    {t.minutes.replace('{count}', String(option))}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        <Button disabled={findTime.isPending} onPress={search}>
          {findTime.isPending ? t.searching : t.search}
        </Button>

        {findTime.isError ? (
          <Text className="text-danger text-sm">{t.error}</Text>
        ) : null}

        {findTime.isSuccess && slots.length === 0 ? (
          <Text className="text-ink-500 text-sm">{t.noResults}</Text>
        ) : null}

        {slots.length > 0 ? (
          <View className="gap-2">
            <Text className="text-ink-700 text-sm font-medium">
              {t.results}
            </Text>
            {slots.map(slot => (
              <View
                key={slot.startsAt}
                className="border-line bg-surface flex-row items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5"
              >
                <Text className="text-ink-800 flex-1 text-sm">
                  {formatSlot(slot.startsAt)}
                </Text>
                <Button
                  variant="ghost"
                  disabled={book.isPending}
                  onPress={() => bookSlot(slot)}
                >
                  {book.isPending ? t.booking : t.book}
                </Button>
              </View>
            ))}
            {book.isError ? (
              <Text className="text-danger text-sm">{t.bookError}</Text>
            ) : null}
          </View>
        ) : null}
      </View>
    </Dialog>
  )
}
