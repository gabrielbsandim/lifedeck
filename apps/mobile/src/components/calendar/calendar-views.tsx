// RN ports of the web's calendar-week-strip, calendar-agenda and the mobile
// variant of calendar-month-view, kept together because they are only ever used
// by the calendar screen.
import { Pressable, Text, View } from 'react-native'
import type { CalendarEventView } from '@lifedeck/application'
import {
  eventCalendarLabel,
  eventColor,
  formatEventTime,
} from '@/components/calendar/event-format'
import { monthGrid } from '@/lib/calendar/calendar-view'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

type EventsByDay = Map<string, CalendarEventView[]>

export function CalendarWeekStrip({
  days,
  selectedDay,
  today,
  locale,
  eventsByDay,
  onSelect,
}: {
  days: string[]
  selectedDay: string
  today: string
  locale: string
  eventsByDay: EventsByDay
  onSelect: (day: string) => void
}) {
  const colors = useThemeColors()
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  })

  return (
    <View className="flex-row gap-1.5 pb-2.5 pt-1">
      {days.map(day => {
        const isSelected = day === selectedDay
        const isToday = day === today
        const dots = (eventsByDay.get(day) ?? []).slice(0, 2)
        return (
          <Pressable
            key={day}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(day)}
            className={cn(
              'flex-1 items-center gap-1 rounded-2xl py-2',
              isSelected && 'bg-brand-600',
            )}
          >
            <Text
              className={cn(
                'text-[11px] font-semibold',
                isSelected
                  ? 'text-white/80'
                  : isToday
                    ? 'text-brand-accent'
                    : 'text-ink-500',
              )}
            >
              {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
            </Text>
            <Text
              className={cn(
                'text-[15px] font-bold',
                isSelected
                  ? 'text-white'
                  : isToday
                    ? 'text-brand-accent'
                    : 'text-ink-800',
              )}
            >
              {Number(day.slice(8, 10))}
            </Text>
            <View className="h-[5px] flex-row items-center gap-0.5">
              {dots.map(event => (
                <View
                  key={event.id}
                  className="h-1 w-1 rounded-full"
                  style={{
                    backgroundColor: isSelected
                      ? '#ffffff'
                      : eventColor(event, colors),
                  }}
                />
              ))}
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

export function CalendarAgenda({
  days,
  today,
  timeZone,
  locale,
  eventsByDay,
  onSelectEvent,
}: {
  days: string[]
  today: string
  timeZone: string
  locale: string
  eventsByDay: EventsByDay
  onSelectEvent: (event: CalendarEventView) => void
}) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.calendar
  const weekdayShort = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })

  const populated = days.filter(day => (eventsByDay.get(day) ?? []).length > 0)

  if (populated.length === 0) {
    return (
      <View className="border-line rounded-[14px] border border-dashed px-5 py-7">
        <Text className="text-ink-500 text-center text-sm">
          {t.noEventsDay}
        </Text>
      </View>
    )
  }

  return (
    <View className="gap-[18px]">
      {populated.map(day => {
        const dayEvents = eventsByDay.get(day) ?? []
        const isToday = day === today
        return (
          <View key={day} className="flex-row gap-3.5">
            <View className="w-[42px] items-center pt-0.5">
              <Text className="text-ink-400 text-[11px] font-bold uppercase">
                {weekdayShort
                  .format(new Date(`${day}T00:00:00.000Z`))
                  .slice(0, 3)}
              </Text>
              <Text
                className={cn(
                  'text-2xl font-extrabold',
                  isToday ? 'text-brand-accent' : 'text-ink-800',
                )}
              >
                {Number(day.slice(8, 10))}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-2">
              {dayEvents.map(event => (
                <Pressable
                  key={event.id}
                  accessibilityRole="button"
                  onPress={() => onSelectEvent(event)}
                  className="border-line bg-surface flex-row gap-3 rounded-[14px] border px-3.5 py-3"
                >
                  <View
                    className="w-1 rounded-full"
                    style={{ backgroundColor: eventColor(event, colors) }}
                  />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text
                      className="text-ink-900 text-[15px] font-semibold"
                      numberOfLines={1}
                    >
                      {event.title || t.untitled}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-ink-500 text-[12.5px]">
                        {formatEventTime(event, timeZone, locale, t.allDay)}
                      </Text>
                      <View className="bg-ink-300 h-[3px] w-[3px] rounded-full" />
                      <View
                        className="h-[7px] w-[7px] rounded-full"
                        style={{ backgroundColor: eventColor(event, colors) }}
                      />
                      <Text
                        className="text-ink-500 min-w-0 flex-1 text-[12.5px]"
                        numberOfLines={1}
                      >
                        {eventCalendarLabel(event, t.syncedTag, t.title)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}

export function CalendarMonthView({
  anchor,
  today,
  selectedDay,
  locale,
  eventsByDay,
  onSelectDay,
}: {
  anchor: string
  today: string
  selectedDay: string
  locale: string
  eventsByDay: EventsByDay
  onSelectDay: (day: string) => void
}) {
  const colors = useThemeColors()
  const weeks = monthGrid(anchor)
  const month = anchor.slice(0, 7)
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  })

  return (
    <View className="border-line bg-surface overflow-hidden rounded-2xl border">
      <View className="border-line flex-row border-b">
        {(weeks[0] ?? []).map(day => (
          <View key={`head-${day}`} className="flex-1 items-center py-2">
            <Text className="text-ink-400 text-[11px] font-bold">
              {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
            </Text>
          </View>
        ))}
      </View>
      {weeks.map((week, index) => (
        <View key={index} className="flex-row">
          {week.map(day => {
            const inMonth = day.slice(0, 7) === month
            const isToday = day === today
            const isSelected = day === selectedDay
            const dots = (eventsByDay.get(day) ?? []).slice(0, 3)
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDay(day)}
                className={cn(
                  'h-14 flex-1 items-center justify-center gap-1',
                  isSelected && 'bg-brand-50',
                )}
              >
                <Text
                  className={cn(
                    'text-[13px]',
                    !inMonth && 'text-ink-300',
                    inMonth && isToday
                      ? 'text-brand-accent font-bold'
                      : inMonth
                        ? 'text-ink-800'
                        : '',
                  )}
                >
                  {Number(day.slice(8, 10))}
                </Text>
                <View className="h-1 flex-row gap-0.5">
                  {dots.map(event => (
                    <View
                      key={event.id}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: eventColor(event, colors) }}
                    />
                  ))}
                </View>
              </Pressable>
            )
          })}
        </View>
      ))}
    </View>
  )
}
