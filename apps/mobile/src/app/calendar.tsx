// RN port of apps/web/src/components/calendar/calendar-screen.tsx, keeping the
// mobile half of that screen (the web's desktop grid has no counterpart here).
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { CalendarEventView } from '@lifedeck/application'
import {
  CalendarAgenda,
  CalendarMonthView,
  CalendarWeekStrip,
} from '@/components/calendar/calendar-views'
import { CalendarConnectionsManager } from '@/components/calendar/calendar-connections-manager'
import { EventEditorDialog } from '@/components/calendar/event-editor-dialog'
import { FindTimeDialog } from '@/components/calendar/find-time-dialog'
import {
  eventCalendarLabel,
  eventColor,
} from '@/components/calendar/event-format'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  PlusIcon,
} from '@/components/icons'
import { Button, Card, Dialog, Screen } from '@/components/ui'
import { deviceTimeZone, todayIso } from '@/lib/api/dates'
import {
  useCalendarEvents,
  useDeleteCalendarEvent,
} from '@/lib/api/use-calendar-events'
import { useSession } from '@/lib/api/use-session'
import {
  groupByDay,
  rangeFor,
  stepAnchor,
  weekDays,
} from '@/lib/calendar/calendar-view'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

type Mode = 'agenda' | 'month'

export default function CalendarScreen() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const t = messages.calendar
  const session = useSession()
  const timeZone = session.data?.timezone || deviceTimeZone()
  const today = todayIso()

  const [mode, setMode] = useState<Mode>('agenda')
  const [anchor, setAnchor] = useState(today)
  const [selectedDay, setSelectedDay] = useState(today)
  const [detail, setDetail] = useState<CalendarEventView | null>(null)
  const [findingTime, setFindingTime] = useState(false)
  const [editing, setEditing] = useState<{
    event: CalendarEventView | null
    day: string
  } | null>(null)

  const available =
    (session.data?.features?.calendar ?? false) &&
    (session.data?.entitlements?.includes('calendarSync') ?? false)
  // Smart scheduling is Premium-only; the "Find time" action gates on it.
  const canFindTime =
    session.data?.entitlements?.includes('smartScheduling') ?? false

  // A month range around the anchor covers both the month grid and the agenda
  // week (which always falls inside the 6-week grid).
  const range = useMemo(() => rangeFor('month', anchor), [anchor])
  const events = useCalendarEvents(range, available)
  const list = useMemo(() => events.data ?? [], [events.data])
  const eventsByDay = useMemo(
    () => groupByDay(list, timeZone),
    [list, timeZone],
  )
  const remove = useDeleteCalendarEvent(range)

  const monthTitle = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${anchor}T00:00:00.000Z`))

  const selLong = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDay}T00:00:00.000Z`))

  if (!available) {
    return (
      <Screen>
        <Card className="items-center gap-3 p-8">
          <Text className="text-ink-500 text-center text-sm">
            {messages.getStarted.calendarBody}
          </Text>
        </Card>
      </Screen>
    )
  }

  function stepBy(unit: 'week' | 'month', direction: 1 | -1) {
    const next = stepAnchor(unit, anchor, direction)
    setAnchor(next)
    setSelectedDay(next)
  }

  function handleDetailDelete(event: CalendarEventView) {
    setDetail(null)
    // Recurring events need the "this / all" scope choice, which lives in the
    // editor; a plain event deletes straight away.
    if (event.recurring) {
      setEditing({ event, day: selectedDay })
      return
    }
    remove.mutate(event.id)
  }

  return (
    <Screen
      refreshing={events.isRefetching}
      onRefresh={() => void events.refetch()}
    >
      <CalendarConnectionsManager enabled={available} premium={canFindTime} />

      <View className="gap-2.5">
        <View className="flex-row items-center justify-between">
          <Text className="text-ink-900 text-lg font-bold">{monthTitle}</Text>
          <View className="flex-row items-center gap-2">
            {canFindTime ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setFindingTime(true)}
                className="border-line bg-surface h-[30px] flex-row items-center gap-1.5 rounded-full border px-3"
              >
                <ClockIcon size={13} color={colors.ink['500']} />
                <Text className="text-ink-500 text-xs font-bold">
                  {t.findTime.title}
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setAnchor(today)
                setSelectedDay(today)
              }}
              className="border-line bg-surface h-[30px] justify-center rounded-full border px-3"
            >
              <Text className="text-ink-500 text-xs font-bold">{t.today}</Text>
            </Pressable>
          </View>
        </View>

        <View className="flex-row gap-2">
          <View className="border-line bg-surface flex-1 flex-row gap-[3px] rounded-xl border p-[3px]">
            {(['agenda', 'month'] as const).map(option => {
              const active = mode === option
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setMode(option)}
                  className={cn(
                    'h-[34px] flex-1 items-center justify-center rounded-[9px]',
                    active && 'bg-brand-600',
                  )}
                >
                  <Text
                    className={cn(
                      'text-[13px] font-semibold',
                      active ? 'text-white' : 'text-ink-500',
                    )}
                  >
                    {option === 'agenda' ? t.agenda : t.month}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.previous}
            onPress={() => stepBy(mode === 'agenda' ? 'week' : 'month', -1)}
            className="border-line bg-surface h-10 w-[38px] items-center justify-center rounded-xl border"
          >
            <ChevronLeftIcon size={16} color={colors.ink['500']} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.next}
            onPress={() => stepBy(mode === 'agenda' ? 'week' : 'month', 1)}
            className="border-line bg-surface h-10 w-[38px] items-center justify-center rounded-xl border"
          >
            <ChevronRightIcon size={16} color={colors.ink['500']} />
          </Pressable>
        </View>
      </View>

      {mode === 'agenda' ? (
        <View>
          <CalendarWeekStrip
            days={weekDays(anchor)}
            selectedDay={selectedDay}
            today={today}
            locale={locale}
            eventsByDay={eventsByDay}
            onSelect={setSelectedDay}
          />
          <CalendarAgenda
            days={weekDays(anchor)}
            today={today}
            timeZone={timeZone}
            locale={locale}
            eventsByDay={eventsByDay}
            onSelectEvent={setDetail}
          />
        </View>
      ) : (
        <View className="gap-4">
          <CalendarMonthView
            anchor={anchor}
            today={today}
            selectedDay={selectedDay}
            locale={locale}
            eventsByDay={eventsByDay}
            onSelectDay={setSelectedDay}
          />
          <View>
            <Text className="text-ink-900 px-1 pb-2.5 text-[13px] font-bold">
              {selLong}
            </Text>
            <CalendarAgenda
              days={[selectedDay]}
              today={today}
              timeZone={timeZone}
              locale={locale}
              eventsByDay={eventsByDay}
              onSelectEvent={setDetail}
            />
          </View>
        </View>
      )}

      <Button onPress={() => setEditing({ event: null, day: selectedDay })}>
        <View className="flex-row items-center gap-2">
          <PlusIcon size={18} color="#ffffff" />
          <Text className="text-sm font-semibold text-white">{t.addEvent}</Text>
        </View>
      </Button>

      {detail ? (
        <EventDetailSheet
          event={detail}
          timeZone={timeZone}
          locale={locale}
          onClose={() => setDetail(null)}
          onEdit={() => {
            setEditing({ event: detail, day: selectedDay })
            setDetail(null)
          }}
          onDelete={() => handleDetailDelete(detail)}
        />
      ) : null}

      {editing ? (
        <EventEditorDialog
          key={editing.event?.id ?? editing.day}
          open
          onClose={() => setEditing(null)}
          range={range}
          event={editing.event}
          defaultDay={editing.day}
        />
      ) : null}

      {findingTime ? (
        <FindTimeDialog
          open
          onClose={() => setFindingTime(false)}
          range={range}
          timeZone={timeZone}
          locale={locale}
        />
      ) : null}
    </Screen>
  )
}

// RN port of apps/web/src/components/calendar/event-detail-sheet.tsx.
function EventDetailSheet({
  event,
  timeZone,
  locale,
  onClose,
  onEdit,
  onDelete,
}: {
  event: CalendarEventView
  timeZone: string
  locale: string
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.calendar

  const dateLong = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: event.allDay ? 'UTC' : timeZone,
  }).format(new Date(event.startsAt))

  const range = event.allDay
    ? t.allDay
    : (() => {
        const format = new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: '2-digit',
          timeZone,
        })
        return `${format.format(new Date(event.startsAt))} – ${format.format(
          new Date(event.endsAt),
        )}`
      })()

  return (
    <Dialog
      open
      onClose={onClose}
      title={event.title || t.untitled}
      variant="sheet"
    >
      <View className="gap-4">
        <View className="flex-row items-start gap-3">
          <View
            className="mt-1 h-3 w-3 rounded-full"
            style={{ backgroundColor: eventColor(event, colors) }}
          />
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-ink-500 text-sm">{dateLong}</Text>
            <Text className="text-ink-800 text-sm font-medium">{range}</Text>
            <Text className="text-ink-400 text-xs">
              {eventCalendarLabel(event, t.syncedTag, t.title)}
            </Text>
          </View>
        </View>

        {event.location ? (
          <Text className="text-ink-700 text-sm">{event.location}</Text>
        ) : null}
        {event.description ? (
          <Text className="text-ink-600 text-sm">{event.description}</Text>
        ) : null}

        <View className="flex-row gap-2">
          <Button className="flex-1" onPress={onEdit}>
            {t.edit}
          </Button>
          <Button variant="ghost" onPress={onDelete}>
            <Text className="text-danger text-sm font-semibold">
              {t.delete}
            </Text>
          </Button>
        </View>
      </View>
    </Dialog>
  )
}
