'use client'

import type { CalendarEventView } from '@lifedeck/application'
import { cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { monthGrid } from '@/lib/calendar/calendar-view'
import { eventColor, eventTint } from '@/components/calendar/event-format'

type Props = {
  anchor: string
  today: string
  selectedDay: string
  locale: string
  eventsByDay: Map<string, CalendarEventView[]>
  variant: 'mobile' | 'desktop'
  onSelectDay: (day: string) => void
  onSelectEvent: (event: CalendarEventView) => void
}

function monthOf(day: string): number {
  return Number(day.slice(5, 7))
}

export function CalendarMonthView({
  anchor,
  today,
  selectedDay,
  locale,
  eventsByDay,
  variant,
  onSelectDay,
  onSelectEvent,
}: Props) {
  const weeks = monthGrid(anchor)
  const anchorMonth = monthOf(anchor)
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: variant === 'desktop' ? 'short' : 'narrow',
    timeZone: 'UTC',
  })
  const cells = weeks.flat()

  if (variant === 'mobile') {
    return (
      <div>
        <div className="grid grid-cols-7">
          {weeks[0]?.map(day => (
            <span
              key={day}
              className="text-ink-400 py-1 pb-2 text-center text-[11px] font-semibold"
            >
              {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(day => {
            const dayEvents = eventsByDay.get(day) ?? []
            const outside = monthOf(day) !== anchorMonth
            const isToday = day === today
            const isSelected = day === selectedDay
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'flex aspect-square flex-col items-center gap-0.5 rounded-xl border-[1.5px] pt-1',
                  isSelected
                    ? 'border-brand-600 bg-brand-50/60'
                    : 'border-transparent',
                  outside && 'opacity-40',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold',
                    isToday
                      ? 'bg-brand-600 text-white'
                      : 'text-ink-700 bg-transparent',
                  )}
                >
                  {Number(day.slice(8, 10))}
                </span>
                <span className="flex max-w-[80%] flex-wrap items-center justify-center gap-0.5">
                  {dayEvents.slice(0, 3).map(event => (
                    <span
                      key={event.id}
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ background: eventColor(event) }}
                    />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <DesktopMonth
      {...{
        cells,
        anchorMonth,
        today,
        weekdayFormat,
        weeks,
        eventsByDay,
        onSelectDay,
        onSelectEvent,
      }}
    />
  )
}

function DesktopMonth({
  cells,
  anchorMonth,
  today,
  weekdayFormat,
  weeks,
  eventsByDay,
  onSelectDay,
  onSelectEvent,
}: {
  cells: string[]
  anchorMonth: number
  today: string
  weekdayFormat: Intl.DateTimeFormat
  weeks: string[][]
  eventsByDay: Map<string, CalendarEventView[]>
  onSelectDay: (day: string) => void
  onSelectEvent: (event: CalendarEventView) => void
}) {
  const { messages } = useI18n()
  const t = messages.calendar
  return (
    <div className="border-line overflow-hidden rounded-2xl border bg-white shadow-sm">
      <div className="border-line/70 bg-bg/60 grid grid-cols-7 border-b">
        {weeks[0]?.map(day => (
          <span
            key={day}
            className="text-ink-500 py-2.5 text-center text-[11.5px] font-bold"
          >
            {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map(day => {
          const dayEvents = eventsByDay.get(day) ?? []
          const outside = monthOf(day) !== anchorMonth
          const isToday = day === today
          const shown = dayEvents.slice(0, 2)
          const extra = dayEvents.length - shown.length
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                'border-line/60 hover:bg-brand-50/40 flex min-h-[104px] flex-col items-stretch gap-[3px] border-b border-r p-1.5 text-left transition-colors',
                outside && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-[22px] min-w-[22px] items-center justify-center self-start rounded-full px-1 text-[12.5px] font-semibold',
                  isToday ? 'bg-brand-600 text-white' : 'text-ink-700',
                )}
              >
                {Number(day.slice(8, 10))}
              </span>
              {shown.map(event => (
                <span
                  key={event.id}
                  role="button"
                  tabIndex={0}
                  onClick={click => {
                    click.stopPropagation()
                    onSelectEvent(event)
                  }}
                  onKeyDown={key => {
                    if (key.key === 'Enter' || key.key === ' ') {
                      key.stopPropagation()
                      onSelectEvent(event)
                    }
                  }}
                  className="flex items-center gap-1.5 overflow-hidden truncate rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                  style={{
                    background: eventTint(event),
                    color: eventColor(event),
                  }}
                >
                  <span
                    className="h-[5px] w-[5px] flex-none rounded-full"
                    style={{ background: eventColor(event) }}
                  />
                  <span className="truncate">{event.title || t.untitled}</span>
                </span>
              ))}
              {extra > 0 && (
                <span className="text-ink-500 px-1.5 text-[10.5px] font-semibold">
                  {t.moreEvents.replace('{count}', String(extra))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
