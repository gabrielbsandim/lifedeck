'use client'

import { useState, type FormEvent } from 'react'
import type { CreateRecurringTaskInput } from '@taskin/application'
import { Button, TextField } from '@taskin/ui'
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

const fieldClass =
  'border-line text-ink-800 focus-visible:border-brand-600 h-11 rounded-xl border bg-white px-3.5 text-sm outline-none'

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

  return (
    <form
      onSubmit={handleSubmit}
      className="border-line bg-bg flex flex-col gap-4 rounded-2xl border p-4"
    >
      <TextField
        value={draft.title}
        onChange={event => patch({ title: event.target.value })}
        placeholder={messages.recurring.titlePlaceholder}
        aria-label={messages.recurring.titlePlaceholder}
        maxLength={280}
      />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {messages.recurring.frequency}
          </span>
          <select
            value={draft.freq}
            onChange={event => patch({ freq: event.target.value as Frequency })}
            className={fieldClass}
          >
            <option value="daily">{messages.recurring.daily}</option>
            <option value="weekly">{messages.recurring.weekly}</option>
            <option value="monthly">{messages.recurring.monthly}</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {messages.recurring.interval}
          </span>
          <input
            type="number"
            min={1}
            value={draft.interval}
            onChange={event =>
              patch({ interval: Number(event.target.value) || 1 })
            }
            className={`${fieldClass} w-20`}
          />
        </label>

        {draft.freq === 'monthly' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-ink-700 text-sm font-medium">
              {messages.recurring.monthday}
            </span>
            <input
              type="number"
              min={1}
              max={31}
              value={draft.byMonthday}
              onChange={event =>
                patch({ byMonthday: Number(event.target.value) || 1 })
              }
              className={`${fieldClass} w-20`}
            />
          </label>
        )}
      </div>

      {draft.freq === 'weekly' && (
        <div className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {messages.recurring.weekdays}
          </span>
          <div className="flex flex-wrap gap-1.5">
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
                      ? 'bg-brand-600 rounded-lg px-3 py-1.5 text-sm font-medium text-white'
                      : 'border-line text-ink-700 rounded-lg border bg-white px-3 py-1.5 text-sm'
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {messages.recurring.startDate}
          </span>
          <input
            type="date"
            value={draft.startDate}
            onChange={event => patch({ startDate: event.target.value })}
            className={fieldClass}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-ink-700 text-sm font-medium">
            {messages.recurring.until}
          </span>
          <input
            type="date"
            value={draft.until}
            min={draft.startDate}
            onChange={event => patch({ until: event.target.value })}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          isLoading={isPending}
          disabled={!draft.title.trim()}
        >
          {messages.recurring.save}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {messages.recurring.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
