// RN port of apps/web/src/components/recurring-task-form.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { CreateRecurringTaskInput } from '@lifedeck/application'
import { DateField } from '@/components/date-time-picker'
import { Stepper } from '@/components/habit-form'
import { Button, Card, Tabs, TextField } from '@/components/ui'
import { todayIso } from '@/lib/api/dates'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/lib/weekdays'
import { cn } from '@/lib/cn'

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

export type RecurringTaskFormProps = {
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

  function handleSubmit() {
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
    <Card className="gap-3.5 p-5">
      <TextField
        value={draft.title}
        onChangeText={value => patch({ title: value })}
        placeholder={t.titlePlaceholder}
        accessibilityLabel={t.titlePlaceholder}
        maxLength={280}
      />

      <Tabs
        tabs={[
          { value: 'daily', label: t.daily },
          { value: 'weekly', label: t.weekly },
          { value: 'monthly', label: t.monthly },
        ]}
        value={draft.freq}
        onChange={value => patch({ freq: value as Frequency })}
      />

      <Stepper
        label={t.interval}
        value={draft.interval}
        min={1}
        max={30}
        onChange={interval => patch({ interval })}
      />

      {draft.freq === 'weekly' ? (
        <View className="flex-row gap-1.5">
          {labels.map((label, day) => {
            const active = draft.byWeekday.includes(day)
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => toggleWeekday(day)}
                className={cn(
                  'h-10 flex-1 items-center justify-center rounded-xl border-[1.5px]',
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-line bg-surface',
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold',
                    active ? 'text-brand-accent-strong' : 'text-ink-600',
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {draft.freq === 'monthly' ? (
        <Stepper
          label={t.monthday}
          value={draft.byMonthday}
          min={1}
          max={31}
          onChange={byMonthday => patch({ byMonthday })}
        />
      ) : null}

      <DateField
        label={t.startDate}
        value={draft.startDate}
        onChange={startDate => patch({ startDate })}
      />
      <DateField
        label={t.until}
        value={draft.until || draft.startDate}
        display={draft.until || '—'}
        onChange={until => patch({ until })}
      />

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          disabled={!draft.title.trim()}
          isLoading={isPending}
          onPress={handleSubmit}
        >
          {t.save}
        </Button>
        {onCancel ? (
          <Button
            variant="ghost"
            className="border-line border"
            onPress={onCancel}
          >
            {t.cancel}
          </Button>
        ) : null}
      </View>
    </Card>
  )
}
