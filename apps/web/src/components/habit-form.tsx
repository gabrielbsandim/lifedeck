'use client'

import { useState, type FormEvent } from 'react'
import type { CreateHabitInput } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/components/recurring-task-form'

type CadenceKind = 'daily' | 'weekdays' | 'times_per_week'

type Draft = {
  title: string
  kind: CadenceKind
  weekdays: number[]
  count: number
  checkinHour: number | null
}

const inputClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-12 rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none'

function initialDraft(initial?: HabitFormProps['initial']): Draft {
  const cadence = initial?.cadence
  return {
    title: initial?.title ?? '',
    kind: cadence?.kind ?? 'daily',
    weekdays: cadence?.kind === 'weekdays' ? cadence.weekdays : [],
    count: cadence?.kind === 'times_per_week' ? cadence.count : 3,
    checkinHour: initial?.checkinHour ?? null,
  }
}

type HabitFormProps = {
  initial?: {
    title: string
    cadence: CreateHabitInput['cadence']
    checkinHour: number | null
  }
  isPending?: boolean
  onSubmit: (input: CreateHabitInput) => void
  onCancel?: () => void
}

export function HabitForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
}: HabitFormProps) {
  const { messages, locale } = useI18n()
  const t = messages.habits
  const labels = weekdayLabels(locale)
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initial))

  function patch(values: Partial<Draft>) {
    setDraft(current => ({ ...current, ...values }))
  }

  function toggleWeekday(day: number) {
    patch({
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter(value => value !== day)
        : [...draft.weekdays, day].sort((a, b) => a - b),
    })
  }

  const weekdaysInvalid =
    draft.kind === 'weekdays' && draft.weekdays.length === 0
  const canSubmit = draft.title.trim().length > 0 && !weekdaysInvalid

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title || weekdaysInvalid) {
      return
    }
    const cadence: CreateHabitInput['cadence'] =
      draft.kind === 'weekdays'
        ? { kind: 'weekdays', weekdays: draft.weekdays }
        : draft.kind === 'times_per_week'
          ? { kind: 'times_per_week', count: draft.count }
          : { kind: 'daily' }
    onSubmit({ title, cadence, checkinHour: draft.checkinHour })
  }

  const kinds: { value: CadenceKind; label: string }[] = [
    { value: 'daily', label: t.daily },
    { value: 'weekdays', label: t.weekdays },
    { value: 'times_per_week', label: t.timesPerWeek },
  ]

  return (
    <form
      onSubmit={handleSubmit}
      className="border-line flex flex-col gap-3.5 rounded-2xl border bg-white p-5 shadow-sm"
    >
      <input
        value={draft.title}
        onChange={event => patch({ title: event.target.value })}
        placeholder={t.titlePlaceholder}
        aria-label={t.titlePlaceholder}
        maxLength={120}
        className={inputClass}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-ink-500 px-0.5 text-xs font-semibold uppercase tracking-wide">
          {t.cadence}
        </span>
        <div className="flex max-w-md gap-1 rounded-xl bg-[oklch(0.97_0.005_265)] p-1">
          {kinds.map(kind => {
            const active = draft.kind === kind.value
            return (
              <button
                key={kind.value}
                type="button"
                onClick={() => patch({ kind: kind.value })}
                aria-pressed={active}
                className={
                  active
                    ? 'text-ink-900 flex-1 rounded-lg bg-white py-2 text-[12.5px] font-semibold shadow-sm'
                    : 'text-ink-500 flex-1 rounded-lg py-2 text-[12.5px] font-semibold'
                }
              >
                {kind.label}
              </button>
            )
          })}
        </div>
      </div>

      {draft.kind === 'weekdays' && (
        <div className="flex max-w-md gap-1.5">
          {labels.map((label, day) => {
            const active = draft.weekdays.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleWeekday(day)}
                aria-pressed={active}
                className={
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-700 h-10 flex-1 rounded-xl border-[1.5px] text-xs font-semibold'
                    : 'border-line text-ink-600 h-10 flex-1 rounded-xl border-[1.5px] bg-white text-xs font-semibold'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {draft.kind === 'times_per_week' && (
        <div className="border-line flex max-w-xs items-center justify-between rounded-xl border bg-[oklch(0.985_0.004_265)] px-3.5 py-2">
          <span className="text-ink-700 text-sm">{t.timesPerWeekUnit}</span>
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label="-"
              onClick={() => patch({ count: Math.max(1, draft.count - 1) })}
              className="border-line text-brand-700 flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-lg leading-none"
            >
              −
            </button>
            <span className="text-ink-900 min-w-5 text-center text-base font-bold">
              {draft.count}
            </span>
            <button
              type="button"
              aria-label="+"
              onClick={() => patch({ count: Math.min(7, draft.count + 1) })}
              className="border-line text-brand-700 flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-lg leading-none"
            >
              +
            </button>
          </div>
        </div>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-ink-500 px-0.5 text-xs font-semibold uppercase tracking-wide">
          {t.checkin}
        </span>
        <select
          value={draft.checkinHour === null ? '' : String(draft.checkinHour)}
          onChange={event =>
            patch({
              checkinHour:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
          className={inputClass}
        >
          <option value="">{t.checkinNone}</option>
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, '0')}:00
            </option>
          ))}
        </select>
        <span className="text-ink-500 text-xs">{t.checkinHint}</span>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!canSubmit || isPending}
          className="bg-brand-600 hover:bg-brand-700 flex h-11 items-center rounded-xl px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {t.save}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="border-line text-ink-700 hover:bg-bg flex h-11 items-center rounded-xl border bg-white px-5 text-sm font-semibold"
          >
            {t.cancel}
          </button>
        )}
      </div>
    </form>
  )
}
