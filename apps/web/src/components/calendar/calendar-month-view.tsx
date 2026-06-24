'use client'

import type { CalendarEventView } from '@lifedeck/application'
import { cn } from '@lifedeck/ui'
import { groupByDay, monthGrid } from '@/lib/calendar/calendar-view'

type Props = {
  anchor: string
  today: string
  timeZone: string
  locale: string
  events: CalendarEventView[]
  onSelectDay: (day: string) => void
  onSelectEvent: (event: CalendarEventView) => void
}

function monthOf(day: string): number {
  return Number(day.slice(5, 7))
}

export function CalendarMonthView({
  anchor,
  today,
  timeZone,
  locale,
  events,
  onSelectDay,
  onSelectEvent,
}: Props) {
  const weeks = monthGrid(anchor)
  const byDay = groupByDay(events, timeZone)
  const anchorMonth = monthOf(anchor)
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })

  return (
    <div className="border-line overflow-hidden rounded-2xl border bg-white">
      <div className="text-ink-500 border-line grid grid-cols-7 border-b text-center text-xs font-semibold">
        {weeks[0]?.map(day => (
          <div key={day} className="py-2">
            {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map(day => {
          const dayEvents = byDay.get(day) ?? []
          const outside = monthOf(day) !== anchorMonth
          const isToday = day === today
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'border-line hover:bg-brand-50/40 flex min-h-20 flex-col gap-1 border-b border-r p-1.5 text-left transition-colors',
                outside && 'bg-bg/40',
              )}
            >
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center self-start rounded-full text-xs font-semibold',
                  isToday
                    ? 'bg-brand-600 text-white'
                    : outside
                      ? 'text-ink-400'
                      : 'text-ink-700',
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              <span className="flex flex-col gap-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <span
                    key={event.id}
                    role="button"
                    tabIndex={0}
                    onClick={clicked => {
                      clicked.stopPropagation()
                      onSelectEvent(event)
                    }}
                    onKeyDown={pressed => {
                      if (pressed.key === 'Enter') {
                        pressed.stopPropagation()
                        onSelectEvent(event)
                      }
                    }}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-[11px] font-medium',
                      event.source === 'google'
                        ? 'bg-violet-500/15 text-violet-600'
                        : 'bg-brand-50 text-brand-700',
                    )}
                  >
                    {eventTime(event, timeZone, locale)} {event.title}
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-ink-400 px-1 text-[11px]">
                    +{dayEvents.length - 3}
                  </span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function eventTime(
  event: CalendarEventView,
  timeZone: string,
  locale: string,
): string {
  if (event.allDay) {
    return ''
  }
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(event.startsAt))
}
