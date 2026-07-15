'use client'

import type { CalendarEventView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  eventCalendarLabel,
  eventColor,
  formatEventTime,
} from '@/components/calendar/event-format'

type Props = {
  days: string[]
  today: string
  timeZone: string
  locale: string
  eventsByDay: Map<string, CalendarEventView[]>
  onSelectEvent: (event: CalendarEventView) => void
}

export function CalendarAgenda({
  days,
  today,
  timeZone,
  locale,
  eventsByDay,
  onSelectEvent,
}: Props) {
  const { messages } = useI18n()
  const t = messages.calendar
  const weekdayShort = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })

  const populated = days.filter(day => (eventsByDay.get(day) ?? []).length > 0)

  if (populated.length === 0) {
    return (
      <div className="border-line/80 text-ink-500 rounded-[14px] border border-dashed bg-white px-5 py-7 text-center text-sm">
        {t.noEventsDay}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[18px]">
      {populated.map(day => {
        const dayEvents = eventsByDay.get(day) ?? []
        const isToday = day === today
        return (
          <div key={day} className="flex gap-3.5">
            <div className="flex w-[42px] flex-none flex-col items-center pt-0.5">
              <span className="text-ink-400 text-[11px] font-bold uppercase tracking-wide">
                {weekdayShort
                  .format(new Date(`${day}T00:00:00.000Z`))
                  .slice(0, 3)}
              </span>
              <span
                className={
                  isToday
                    ? 'text-brand-600 text-2xl font-extrabold leading-tight tracking-tight'
                    : 'text-ink-800 text-2xl font-extrabold leading-tight tracking-tight'
                }
              >
                {Number(day.slice(8, 10))}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              {dayEvents.map(event => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onSelectEvent(event)}
                  className="border-line flex w-full items-stretch gap-3 rounded-[14px] border bg-white px-3.5 py-3 text-left shadow-sm transition active:scale-[0.99]"
                >
                  <span
                    className="w-1 flex-none rounded-full"
                    style={{ background: eventColor(event) }}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-ink-900 truncate text-[15px] font-semibold leading-snug">
                      {event.title || t.untitled}
                    </span>
                    <span className="text-ink-500 flex items-center gap-2 text-[12.5px]">
                      <span className="tabular-nums">
                        {formatEventTime(event, timeZone, locale, t.allDay)}
                      </span>
                      <span className="bg-ink-300 h-[3px] w-[3px] flex-none rounded-full" />
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <span
                          className="h-[7px] w-[7px] flex-none rounded-full"
                          style={{ background: eventColor(event) }}
                        />
                        <span className="truncate">
                          {eventCalendarLabel(event, t.syncedTag, t.title)}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
