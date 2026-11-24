'use client'

import type { DayWindowDraft, WeekDraft } from '@/lib/booking/host'
import { weekdayLabels } from '@/components/recurring-task-form'
import { inputClass, type HostCopy } from '@/components/booking/host/fields'

// Monday first: the order people read a working week in.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const
const NEW_WINDOW: DayWindowDraft = { start: '09:00', end: '17:00' }

export function WindowRows({
  windows,
  onChange,
  t,
  dayLabel,
}: {
  windows: DayWindowDraft[]
  onChange: (windows: DayWindowDraft[]) => void
  t: HostCopy['hours']
  dayLabel: string
}) {
  const update = (index: number, patch: Partial<DayWindowDraft>) =>
    onChange(
      windows.map((window, at) =>
        at === index ? { ...window, ...patch } : window,
      ),
    )
  return (
    <div className="flex min-w-0 flex-col gap-2">
      {windows.map((window, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="time"
            aria-label={`${dayLabel} ${t.from}`}
            className={`${inputClass} min-w-0 flex-1 px-2 sm:w-36 sm:flex-none [&::-webkit-calendar-picker-indicator]:hidden`}
            value={window.start}
            onChange={event => update(index, { start: event.target.value })}
          />
          <span className="text-ink-400 text-sm">-</span>
          <input
            type="time"
            aria-label={`${dayLabel} ${t.to}`}
            className={`${inputClass} min-w-0 flex-1 px-2 sm:w-36 sm:flex-none [&::-webkit-calendar-picker-indicator]:hidden`}
            value={window.end}
            onChange={event => update(index, { end: event.target.value })}
          />
          <button
            type="button"
            aria-label={`${t.removeWindow} ${dayLabel}`}
            onClick={() => onChange(windows.filter((_, at) => at !== index))}
            className="text-ink-400 hover:text-danger h-9 w-9 flex-none rounded-lg text-lg"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...windows, NEW_WINDOW])}
        className="text-brand-accent self-start text-sm font-semibold"
      >
        + {t.addWindow}
      </button>
    </div>
  )
}

export function WeeklyHoursEditor({
  draft,
  onChange,
  invalidDay,
  locale,
  t,
}: {
  draft: WeekDraft
  onChange: (draft: WeekDraft) => void
  invalidDay: number | null
  locale: string
  t: HostCopy['hours']
}) {
  const labels = weekdayLabels(locale)
  const setDay = (weekday: number, windows: DayWindowDraft[]) =>
    onChange(draft.map((day, at) => (at === weekday ? windows : day)))

  return (
    <div className="flex flex-col gap-3">
      {DISPLAY_ORDER.map(weekday => {
        const windows = draft[weekday] ?? []
        const open = windows.length > 0
        const label = labels[weekday]!
        return (
          <div
            key={weekday}
            className={
              invalidDay === weekday
                ? 'border-danger flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start'
                : 'border-line flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-start'
            }
          >
            <label className="flex w-28 flex-none items-center gap-2 pt-2 text-sm font-semibold capitalize">
              <input
                type="checkbox"
                className="accent-brand-600 h-4 w-4"
                checked={open}
                onChange={event =>
                  setDay(weekday, event.target.checked ? [NEW_WINDOW] : [])
                }
              />
              {label}
            </label>
            {open ? (
              <WindowRows
                windows={windows}
                onChange={next => setDay(weekday, next)}
                t={t}
                dayLabel={label}
              />
            ) : (
              <p className="text-ink-400 pt-2 text-sm">{t.closed}</p>
            )}
          </div>
        )
      })}
      {invalidDay !== null && (
        <p role="alert" className="text-danger text-sm">
          {t.invalidDay.replace('{day}', labels[invalidDay]!)}
        </p>
      )}
    </div>
  )
}
