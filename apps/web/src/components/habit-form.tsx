'use client'

import { useState, type FormEvent } from 'react'
import type { CreateHabitInput } from '@lifedeck/application'
import { Button, TextField } from '@lifedeck/ui'
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

const fieldClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-11 rounded-xl border bg-white px-3.5 text-sm outline-none'

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
      className="border-line bg-bg flex flex-col gap-4 rounded-2xl border p-4"
    >
      <TextField
        value={draft.title}
        onChange={event => patch({ title: event.target.value })}
        placeholder={t.titlePlaceholder}
        aria-label={t.titlePlaceholder}
        maxLength={120}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-ink-700 text-sm font-medium">{t.cadence}</span>
        <div className="flex flex-wrap gap-1.5">
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
                    ? 'bg-brand-600 rounded-lg px-3 py-1.5 text-sm font-medium text-white'
                    : 'border-line text-ink-700 rounded-lg border bg-white px-3 py-1.5 text-sm'
                }
              >
                {kind.label}
              </button>
            )
          })}
        </div>
      </div>

      {draft.kind === 'weekdays' && (
        <div className="flex flex-wrap gap-1.5">
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
                    ? 'bg-brand-600 rounded-lg px-3 py-1.5 text-sm font-medium text-white'
                    : 'border-line text-ink-700 rounded-lg border bg-white px-3 py-1.5 text-sm'
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {draft.kind === 'times_per_week' && (
        <label className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={7}
            value={draft.count}
            onChange={event =>
              patch({
                count: Math.min(
                  7,
                  Math.max(1, Number(event.target.value) || 1),
                ),
              })
            }
            className={`${fieldClass} w-20`}
          />
          <span className="text-ink-600 text-sm">{t.timesPerWeekUnit}</span>
        </label>
      )}

      <label className="flex flex-col gap-1.5">
        <span className="text-ink-700 text-sm font-medium">{t.checkin}</span>
        <select
          value={draft.checkinHour === null ? '' : String(draft.checkinHour)}
          onChange={event =>
            patch({
              checkinHour:
                event.target.value === '' ? null : Number(event.target.value),
            })
          }
          className={fieldClass}
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
        <Button type="submit" isLoading={isPending} disabled={!canSubmit}>
          {t.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
