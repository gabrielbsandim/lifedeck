// RN port of apps/web/src/components/habit-form.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { CreateHabitInput } from '@lifedeck/application'
import { Button, Card, Select, Tabs, TextField } from '@/components/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/lib/weekdays'
import { cn } from '@/lib/cn'

type CadenceKind = 'daily' | 'weekdays' | 'times_per_week'

type Draft = {
  title: string
  kind: CadenceKind
  weekdays: number[]
  count: number
  checkinHour: number | null
}

export type HabitFormProps = {
  initial?: {
    title: string
    cadence: CreateHabitInput['cadence']
    checkinHour: number | null
  }
  isPending?: boolean
  onSubmit: (input: CreateHabitInput) => void
  onCancel?: () => void
}

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

  function handleSubmit() {
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

  return (
    <Card className="gap-3.5 p-5">
      <TextField
        value={draft.title}
        onChangeText={value => patch({ title: value })}
        placeholder={t.titlePlaceholder}
        accessibilityLabel={t.titlePlaceholder}
        maxLength={120}
      />

      <View className="gap-1.5">
        <Text className="text-ink-500 px-0.5 text-xs font-semibold uppercase">
          {t.cadence}
        </Text>
        <Tabs
          tabs={[
            { value: 'daily', label: t.daily },
            { value: 'weekdays', label: t.weekdays },
            { value: 'times_per_week', label: t.timesPerWeek },
          ]}
          value={draft.kind}
          onChange={value => patch({ kind: value as CadenceKind })}
        />
      </View>

      {draft.kind === 'weekdays' ? (
        <View className="flex-row gap-1.5">
          {labels.map((label, day) => {
            const active = draft.weekdays.includes(day)
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

      {draft.kind === 'times_per_week' ? (
        <Stepper
          label={t.timesPerWeekUnit}
          value={draft.count}
          min={1}
          max={7}
          onChange={count => patch({ count })}
        />
      ) : null}

      <View className="gap-1.5">
        <Select
          label={t.checkin}
          title={t.checkin}
          value={draft.checkinHour === null ? '' : String(draft.checkinHour)}
          placeholder={t.checkinNone}
          options={[
            { value: '', label: t.checkinNone },
            ...Array.from({ length: 24 }, (_, hour) => ({
              value: String(hour),
              label: `${String(hour).padStart(2, '0')}:00`,
            })),
          ]}
          onChange={value =>
            patch({ checkinHour: value === '' ? null : Number(value) })
          }
        />
        <Text className="text-ink-500 text-xs">{t.checkinHint}</Text>
      </View>

      <View className="flex-row gap-2">
        <Button
          className="flex-1"
          disabled={!canSubmit}
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

export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <View className="border-line bg-bg flex-row items-center justify-between rounded-xl border px-3.5 py-2">
      <Text className="text-ink-700 text-sm">{label}</Text>
      <View className="flex-row items-center gap-3.5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="-"
          onPress={() => onChange(Math.max(min, value - 1))}
          className="border-line bg-surface h-8 w-8 items-center justify-center rounded-lg border"
        >
          <Text className="text-brand-accent-strong text-lg">−</Text>
        </Pressable>
        <Text className="text-ink-900 min-w-5 text-center text-base font-bold">
          {value}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="+"
          onPress={() => onChange(Math.min(max, value + 1))}
          className="border-line bg-surface h-8 w-8 items-center justify-center rounded-lg border"
        >
          <Text className="text-brand-accent-strong text-lg">+</Text>
        </Pressable>
      </View>
    </View>
  )
}
