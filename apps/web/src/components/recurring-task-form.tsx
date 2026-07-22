'use client'

import { useState, type FormEvent } from 'react'
import type { CreateRecurringTaskInput } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { todayIso } from '@/lib/api/dates'

type Frequency = 'daily' | 'weekly' | 'monthly'

type Draft = {
  title: string
  freq: Frequency
  interval: number
  byWeekday: number[]
  byMonthday: number
  startDate: string
  until: string
}

export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    timeZone: 'UTC',
  })
  const sunday = Date.UTC(2026, 5, 21)
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(sunday + index * 86_400_000)),
  )
}

const inputClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-12 rounded-xl border-[1.5px] bg-white px-3.5 text-sm outline-none'

const stepperButtonClass =
  'border-line text-brand-700 flex h-8 w-8 items-center justify-center rounded-lg border bg-white text-lg leading-none'

type RecurringTaskFormProps = {
  initial?: { title: string; rule: CreateRecurringTaskInput['rule'] }
  isPending?: boolean
  onSubmit: (input: CreateRecurringTaskInput) => void
  onCancel?: () => void
}

export function RecurringTaskForm({
  initial,
  isPending,
  onSubmit,
  onCancel,
}: RecurringTaskFormProps) {
  const { messages, locale } = useI18n()
  const t = messages.recurring
  const labels = weekdayLabels(locale)

  const [draft, setDraft] = useState<Draft>(() => ({
    title: initial?.title ?? '',
    freq: initial?.rule.freq ?? 'daily',
    interval: initial?.rule.interval ?? 1,
    byWeekday: initial?.rule.byWeekday ?? [],
    byMonthday: initial?.rule.byMonthday ?? 1,
    startDate: initial?.rule.startDate ?? todayIso(),
    until: initial?.rule.until ?? '',
  }))

  function patch(values: Partial<Draft>) {
    setDraft(current => ({ ...current, ...values }))
  }

  function toggleWeekday(day: number) {
    patch({
      byWeekday: draft.byWeekday.includes(day)
        ? draft.byWeekday.filter(value => value !== day)
        : [...draft.byWeekday, day].sort((a, b) => a - b),
    })
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) {
      return
    }
    const rule: CreateRecurringTaskInput['rule'] = {
      freq: draft.freq,
      interval: Math.max(1, draft.interval),
      startDate: draft.startDate,
      ...(draft.freq === 'weekly' && draft.byWeekday.length > 0
        ? { byWeekday: draft.byWeekday }
        : {}),
      ...(draft.freq === 'monthly' ? { byMonthday: draft.byMonthday } : {}),
      ...(draft.until ? { until: draft.until } : {}),
    }
    onSubmit({ title, rule })
  }

  const frequencies: { value: Frequency; label: string }[] = [
    { value: 'daily', label: t.daily },
    { value: 'weekly', label: t.weekly },
    { value: 'monthly', label: t.monthly },
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
        maxLength={280}
        className={inputClass}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-[oklch(0.97_0.005_265)] p-1">
          {frequencies.map(frequency => {
            const active = draft.freq === frequency.value
            return (
              <button
                key={frequency.value}
                type="button"
                onClick={() => patch({ freq: frequency.value })}
                aria-pressed={active}
                className={
                  active
                    ? 'text-ink-900 rounded-lg bg-white px-4 py-2 text-[13px] font-semibold shadow-sm'
                    : 'text-ink-500 rounded-lg px-4 py-2 text-[13px] font-semibold'
                }
              >
                {frequency.label}
              </button>
            )
          })}
        </div>

        <div className="border-line flex items-center gap-2.5 rounded-xl border bg-[oklch(0.985_0.004_265)] px-3 py-1.5">
          <span className="text-ink-500 text-[13px]">{t.interval}</span>
          <button
            type="button"
            aria-label="-"
            onClick={() => patch({ interval: Math.max(1, draft.interval - 1) })}
            className={stepperButtonClass}
          >
            −
          </button>
          <span className="text-ink-900 min-w-4 text-center text-[15px] font-bold">
            {draft.interval}
          </span>
          <button
            type="button"
            aria-label="+"
            onClick={() => patch({ interval: draft.interval + 1 })}
            className={stepperButtonClass}
          >
            +
          </button>
        </div>
      </div>

      {draft.freq === 'weekly' && (
        <div className="flex max-w-md gap-1.5">
          {labels.map((label, day) => {
            const active = draft.byWeekday.includes(day)
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

      {draft.freq === 'monthly' && (
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-500 px-0.5 text-xs font-semibold uppercase tracking-wide">
            {t.monthday}
          </span>
          <input
            type="number"
            min={1}
            max={31}
            value={draft.byMonthday}
            onChange={event =>
              patch({ byMonthday: Number(event.target.value) || 1 })
            }
            className={`${inputClass} w-24`}
          />
        </label>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-500 px-0.5 text-xs font-semibold uppercase tracking-wide">
            {t.startDate}
          </span>
          <input
            type="date"
            value={draft.startDate}
            onChange={event => patch({ startDate: event.target.value })}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-500 px-0.5 text-xs font-semibold uppercase tracking-wide">
            {t.until}
          </span>
          <input
            type="date"
            value={draft.until}
            min={draft.startDate}
            onChange={event => patch({ until: event.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!draft.title.trim() || isPending}
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
