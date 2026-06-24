'use client'

import type { CalendarEventView } from '@lifedeck/application'
import { Badge, EmptyState } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { groupByDay } from '@/lib/calendar/calendar-view'

type Props = {
  days: string[]
  today: string
  timeZone: string
  locale: string
  events: CalendarEventView[]
  onSelectEvent: (event: CalendarEventView) => void
}

export function CalendarAgenda({
  days,
  today,
  timeZone,
  locale,
  events,
  onSelectEvent,
}: Props) {
  const { messages } = useI18n()
  const t = messages.calendar
  const byDay = groupByDay(events, timeZone)
  const dayHeading = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })

  if (events.length === 0) {
    return <EmptyState title={t.empty} description={t.emptyHint} />
  }

  return (
    <div className="flex flex-col gap-4">
      {days.map(day => {
        const dayEvents = byDay.get(day) ?? []
        if (dayEvents.length === 0) {
          return null
        }
        return (
          <section key={day} className="flex flex-col gap-2">
            <h3 className="text-ink-500 text-xs font-semibold uppercase tracking-wide">
              {dayHeading.format(new Date(`${day}T00:00:00.000Z`))}
              {day === today ? ` · ${t.today}` : ''}
            </h3>
            <ul className="border-line divide-line divide-y overflow-hidden rounded-2xl border bg-white">
              {dayEvents.map(event => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="hover:bg-brand-50/40 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
                  >
                    <span className="text-ink-500 w-16 shrink-0 text-sm font-medium tabular-nums">
                      {timeLabel(event, timeZone, locale, t.allDay)}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-ink-800 truncate text-sm font-medium">
                        {event.title || t.untitled}
                      </span>
                      {event.location && (
                        <span className="text-ink-500 truncate text-xs">
                          {event.location}
                        </span>
                      )}
                    </span>
                    {event.source === 'google' && (
                      <Badge tone="shared">{t.syncedTag}</Badge>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function timeLabel(
  event: CalendarEventView,
  timeZone: string,
  locale: string,
  allDayLabel: string,
): string {
  if (event.allDay) {
    return allDayLabel
  }
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(new Date(event.startsAt))
}
