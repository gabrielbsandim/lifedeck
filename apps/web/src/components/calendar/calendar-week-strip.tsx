'use client'

import type { CalendarEventView } from '@lifedeck/application'
import { cn } from '@lifedeck/ui'
import { eventColor } from '@/components/calendar/event-format'

type Props = {
  days: string[]
  selectedDay: string
  today: string
  locale: string
  eventsByDay: Map<string, CalendarEventView[]>
  onSelect: (day: string) => void
}

export function CalendarWeekStrip({
  days,
  selectedDay,
  today,
  locale,
  eventsByDay,
  onSelect,
}: Props) {
  const weekdayFormat = new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  })

  return (
    <div className="flex gap-1.5 pb-2.5 pt-1">
      {days.map(day => {
        const isSelected = day === selectedDay
        const isToday = day === today
        const dots = (eventsByDay.get(day) ?? []).slice(0, 2)
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(day)}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 transition active:scale-95',
              isSelected ? 'bg-brand-600' : 'hover:bg-brand-50/60',
            )}
          >
            <span
              className={cn(
                'text-[11px] font-semibold',
                isSelected
                  ? 'text-white/80'
                  : isToday
                    ? 'text-brand-600'
                    : 'text-ink-500',
              )}
            >
              {weekdayFormat.format(new Date(`${day}T00:00:00.000Z`))}
            </span>
            <span
              className={cn(
                'text-[15px] font-bold',
                isSelected
                  ? 'text-white'
                  : isToday
                    ? 'text-brand-600'
                    : 'text-ink-800',
              )}
            >
              {Number(day.slice(8, 10))}
            </span>
            <span className="flex h-[5px] items-center gap-0.5">
              {dots.map(event => (
                <span
                  key={event.id}
                  className="h-1 w-1 rounded-full"
                  style={{
                    background: isSelected ? 'white' : eventColor(event),
                  }}
                />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}
