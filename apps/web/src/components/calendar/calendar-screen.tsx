'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { CalendarEventView } from '@lifedeck/application'
import { cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { browserTimeZone, todayIso } from '@/lib/api/dates'
import {
  groupByDay,
  rangeFor,
  stepAnchor,
  weekDays,
} from '@/lib/calendar/calendar-view'
import {
  useCalendarEvents,
  useDeleteCalendarEvent,
} from '@/lib/api/use-calendar-events'
import { CalendarMonthView } from '@/components/calendar/calendar-month-view'
import { CalendarAgenda } from '@/components/calendar/calendar-agenda'
import { CalendarWeekStrip } from '@/components/calendar/calendar-week-strip'
import { EventEditorDialog } from '@/components/calendar/event-editor-dialog'
import { EventDetailSheet } from '@/components/calendar/event-detail-sheet'
import { FindTimeDialog } from '@/components/calendar/find-time-dialog'
import { CalendarConnectionsManager } from '@/components/calendar/calendar-connections-manager'

type Mode = 'agenda' | 'month'

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ClockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

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

  // A month range around the anchor covers both the desktop grid and the
  // mobile agenda week (which always falls inside the 6-week grid).
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
    return null
  }

  function goToday() {
    setAnchor(today)
    setSelectedDay(today)
  }

  function stepBy(unit: 'week' | 'month', direction: 1 | -1) {
    const next = stepAnchor(unit, anchor, direction)
    setAnchor(next)
    setSelectedDay(next)
  }

  function openNew(day: string) {
    setEditing({ event: null, day })
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
    <div className="flex flex-col gap-4">
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

      <CalendarConnectionsManager enabled={available} premium={canFindTime} />

      {/* ───────── Mobile ───────── */}
      <div className="relative lg:hidden">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-ink-900 text-lg font-bold capitalize">
            {monthTitle}
          </h1>
          <div className="flex items-center gap-2">
            {canFindTime && (
              <button
                type="button"
                onClick={() => setFindingTime(true)}
                className="border-line text-ink-500 flex h-[30px] items-center gap-1.5 rounded-full border bg-white px-3 text-xs font-bold"
              >
                <ClockIcon size={13} />
                {t.findTime.title}
              </button>
            )}
            <button
              type="button"
              onClick={goToday}
              className="border-line text-ink-500 h-[30px] rounded-full border bg-white px-3 text-xs font-bold"
            >
              {t.today}
            </button>
          </div>
        </div>

        <div className="mb-2.5 flex gap-2">
          <div className="border-line flex flex-1 gap-[3px] rounded-xl border bg-white p-[3px]">
            {(['agenda', 'month'] as const).map(option => {
              const active = mode === option
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMode(option)}
                  aria-pressed={active}
                  className={cn(
                    'h-[34px] flex-1 rounded-[9px] text-[13px] font-semibold transition',
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-ink-500',
                  )}
                >
                  {option === 'agenda' ? t.agenda : t.month}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            aria-label={t.previous}
            onClick={() => stepBy(mode === 'agenda' ? 'week' : 'month', -1)}
            className="border-line text-ink-500 flex h-10 w-[38px] flex-none items-center justify-center rounded-xl border bg-white"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            aria-label={t.next}
            onClick={() => stepBy(mode === 'agenda' ? 'week' : 'month', 1)}
            className="border-line text-ink-500 flex h-10 w-[38px] flex-none items-center justify-center rounded-xl border bg-white"
          >
            <Chevron dir="right" />
          </button>
        </div>

        {mode === 'agenda' ? (
          <div className="pb-24">
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
          </div>
        ) : (
          <div className="pb-24">
            <CalendarMonthView
              variant="mobile"
              anchor={anchor}
              today={today}
              selectedDay={selectedDay}
              locale={locale}
              eventsByDay={eventsByDay}
              onSelectDay={setSelectedDay}
              onSelectEvent={setDetail}
            />
            <div className="mt-4">
              <p className="text-ink-900 px-1 pb-2.5 text-[13px] font-bold capitalize">
                {selLong}
              </p>
              <CalendarAgenda
                days={[selectedDay]}
                today={today}
                timeZone={timeZone}
                locale={locale}
                eventsByDay={eventsByDay}
                onSelectEvent={setDetail}
              />
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => openNew(selectedDay)}
          className="bg-brand-600 shadow-brand-600/40 fixed bottom-24 right-5 z-20 flex h-[52px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold text-white shadow-lg active:scale-95"
        >
          <PlusIcon />
          {t.addEvent}
        </button>
      </div>

      {/* ───────── Desktop ───────── */}
      <div className="hidden lg:block">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-ink-900 text-[26px] font-bold tracking-tight">
            {t.title}
          </h1>
          <div className="flex items-center gap-2">
            {canFindTime && (
              <button
                type="button"
                onClick={() => setFindingTime(true)}
                className="border-line text-ink-700 hover:bg-bg flex h-10 items-center gap-2 rounded-[13px] border bg-white px-4 text-sm font-semibold"
              >
                <ClockIcon size={16} />
                {t.findTime.title}
              </button>
            )}
            <button
              type="button"
              onClick={() => openNew(selectedDay)}
              className="bg-brand-600 hover:bg-brand-700 flex h-10 items-center gap-2 rounded-[13px] px-4 text-sm font-semibold text-white shadow-sm"
            >
              <PlusIcon size={17} />
              {t.newEvent}
            </button>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-ink-900 text-lg font-bold capitalize">
            {monthTitle}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label={t.previous}
              onClick={() => stepBy('month', -1)}
              className="border-line text-ink-500 flex h-9 w-9 items-center justify-center rounded-[10px] border bg-white"
            >
              <Chevron dir="left" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="border-line text-ink-700 h-9 rounded-[10px] border bg-white px-3.5 text-sm font-semibold"
            >
              {t.today}
            </button>
            <button
              type="button"
              aria-label={t.next}
              onClick={() => stepBy('month', 1)}
              className="border-line text-ink-500 flex h-9 w-9 items-center justify-center rounded-[10px] border bg-white"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        <CalendarMonthView
          variant="desktop"
          anchor={anchor}
          today={today}
          selectedDay={selectedDay}
          locale={locale}
          eventsByDay={eventsByDay}
          onSelectDay={openNew}
          onSelectEvent={setDetail}
        />
      </div>

      {detail && (
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

      {findingTime && (
        <FindTimeDialog
          open
          onClose={() => setFindingTime(false)}
          range={range}
          timeZone={timeZone}
          locale={locale}
        />
      )}
    </div>
  )
}
