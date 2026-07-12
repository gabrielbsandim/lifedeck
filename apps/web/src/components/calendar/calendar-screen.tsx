'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CalendarEventView } from '@lifedeck/application'
import { Button, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { browserTimeZone, todayIso } from '@/lib/api/dates'
import {
  rangeFor,
  stepAnchor,
  weekDays,
  type CalendarView,
} from '@/lib/calendar/calendar-view'
import { useCalendarEvents } from '@/lib/api/use-calendar-events'
import { CalendarMonthView } from '@/components/calendar/calendar-month-view'
import { CalendarAgenda } from '@/components/calendar/calendar-agenda'
import { EventEditorDialog } from '@/components/calendar/event-editor-dialog'
import { GoogleCalendarsManager } from '@/components/calendar/google-calendars-manager'

const VIEWS: CalendarView[] = ['month', 'week', 'day']

export function CalendarScreen() {
  const { messages, locale } = useI18n()
  const t = messages.calendar
  const session = useSession()
  const params = useSearchParams()
  const timeZone = session.data?.timezone || browserTimeZone()
  const today = todayIso()

  const connectStatus = params.get('calendar')
  const [notice, setNotice] = useState<'connected' | 'error' | null>(
    connectStatus === 'connected' || connectStatus === 'error'
      ? connectStatus
      : null,
  )

  const [view, setView] = useState<CalendarView>('month')
  const [anchor, setAnchor] = useState(today)
  const [editing, setEditing] = useState<{
    event: CalendarEventView | null
    day: string
  } | null>(null)

  const available =
    (session.data?.features?.calendar ?? false) &&
    (session.data?.entitlements?.includes('calendarSync') ?? false)

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor])
  const events = useCalendarEvents(range, available)
  const list = events.data ?? []

  const headingFormat = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  const heading = headingFormat.format(new Date(`${anchor}T00:00:00.000Z`))

  if (!available) {
    return null
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-ink-900 text-xl font-bold tracking-tight">
            {t.title}
          </h1>
        </div>

        <GoogleCalendarsManager enabled={available} />

        {notice && (
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left text-sm',
              notice === 'connected'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800',
            )}
          >
            {notice === 'connected' ? t.googleConnected : t.googleError}
          </button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="border-line inline-flex rounded-xl border bg-white p-0.5">
            {VIEWS.map(option => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                aria-pressed={view === option}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  view === option
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-500 hover:text-ink-700',
                )}
              >
                {t[option]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchor(stepAnchor(view, anchor, -1))}
              aria-label={t.previous}
              className="border-line text-ink-600 hover:bg-bg flex h-9 w-9 items-center justify-center rounded-lg border"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setAnchor(today)}
              className="border-line text-ink-700 hover:bg-bg h-9 rounded-lg border px-3 text-sm font-medium"
            >
              {t.today}
            </button>
            <button
              type="button"
              onClick={() => setAnchor(stepAnchor(view, anchor, 1))}
              aria-label={t.next}
              className="border-line text-ink-600 hover:bg-bg flex h-9 w-9 items-center justify-center rounded-lg border"
            >
              ›
            </button>
            <Button
              className="ml-1 h-9 px-3"
              onClick={() => setEditing({ event: null, day: anchor })}
            >
              {t.newEvent}
            </Button>
          </div>
        </div>

        <p className="text-ink-600 text-sm font-medium capitalize">{heading}</p>
      </header>

      {view === 'month' ? (
        <CalendarMonthView
          anchor={anchor}
          today={today}
          timeZone={timeZone}
          locale={locale}
          events={list}
          onSelectDay={day => setEditing({ event: null, day })}
          onSelectEvent={event => setEditing({ event, day: anchor })}
        />
      ) : (
        <CalendarAgenda
          days={view === 'week' ? weekDays(anchor) : [anchor]}
          today={today}
          timeZone={timeZone}
          locale={locale}
          events={list}
          onSelectEvent={event => setEditing({ event, day: anchor })}
        />
      )}

      {editing && (
        <EventEditorDialog
          key={editing.event?.id ?? editing.day}
          open
          onClose={() => setEditing(null)}
          range={range}
          event={editing.event}
          defaultDay={editing.day}
        />
      )}
    </div>
  )
}
