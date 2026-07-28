// RN port of apps/web/src/components/habits-manager.tsx: habit cards with the
// trailing-week bar (each cell toggles that day), the mark-done button, and the
// Free single-habit upsell.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { HabitView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'
import {
  CheckIcon,
  FlameIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'
import { HabitForm } from '@/components/habit-form'
import { Button, Card, Screen, Skeleton } from '@/components/ui'
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useLogHabit,
  useUpdateHabit,
} from '@/lib/api/use-habits'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/lib/weekdays'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

type HabitMessages = Messages['habits']

function describeCadence(
  cadence: HabitView['cadence'],
  locale: string,
  t: HabitMessages,
): string {
  if (cadence.kind === 'weekdays') {
    const labels = weekdayLabels(locale)
    return cadence.weekdays.map(day => labels[day]).join(', ')
  }
  if (cadence.kind === 'times_per_week') {
    return `${cadence.count} ${t.timesPerWeekUnit}`
  }
  return t.daily
}

// A single-letter weekday initial for the trailing-week bar, derived from the
// civil date so it always matches the day the completion belongs to.
function weekdayInitial(locale: string, date: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

// The trailing-week bar: one tall cell per day, filled with a check when done,
// dashed when scheduled-but-missed, faint when the cadence never asked for it.
// Every cell is a button, so a forgotten check-in can be backfilled.
function WeekBar({
  days,
  locale,
  label,
  toggleLabel,
  onToggle,
}: {
  days: HabitView['recentDays']
  locale: string
  label: string
  toggleLabel: string
  onToggle: (date: string, done: boolean) => void
}) {
  return (
    <View accessible accessibilityLabel={label} className="flex-row gap-1.5">
      {days.map((day, index) => {
        const isToday = index === days.length - 1
        return (
          <View key={day.date} className="flex-1 items-center gap-1.5">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${toggleLabel} ${day.date}`}
              accessibilityState={{ selected: day.done }}
              onPress={() => onToggle(day.date, !day.done)}
              className={cn(
                'h-11 w-full items-center justify-center rounded-xl',
                day.done
                  ? 'bg-brand-500'
                  : day.scheduled
                    ? 'border-brand-300 bg-brand-50 border border-dashed'
                    : 'bg-line',
                isToday && 'border-brand-300 border-2',
              )}
            >
              {day.done ? <CheckIcon size={16} color="#ffffff" /> : null}
            </Pressable>
            <Text
              className={cn(
                'text-[11px]',
                isToday ? 'text-brand-accent-strong font-bold' : 'text-ink-400',
              )}
            >
              {weekdayInitial(locale, day.date)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

function HabitCard({
  habit,
  locale,
  t,
  onEdit,
  onToggleActive,
  onDelete,
  onToggleDone,
  onToggleDay,
}: {
  habit: HabitView
  locale: string
  t: HabitMessages
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onToggleDone: () => void
  onToggleDay: (date: string, done: boolean) => void
}) {
  const colors = useThemeColors()

  return (
    <Card className={cn('gap-4 p-4', !habit.active && 'opacity-70')}>
      <View className="flex-row items-start gap-2.5">
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className={cn(
                'text-base font-bold',
                habit.active ? 'text-ink-900' : 'text-ink-500 line-through',
              )}
            >
              {habit.title}
            </Text>
            {!habit.active ? (
              <View className="bg-line h-5 justify-center rounded-full px-2">
                <Text className="text-ink-500 text-[10.5px] font-bold">
                  {t.paused.toUpperCase()}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-ink-500 mt-0.5 text-[13px]">
            {describeCadence(habit.cadence, locale, t)}
          </Text>
        </View>

        {habit.currentStreak > 0 ? (
          <View
            accessibilityLabel={t.streakAria}
            className="bg-warning/20 h-7 flex-row items-center gap-1 rounded-full px-2.5"
          >
            <FlameIcon size={15} color={colors.warning} />
            <Text className="text-warning text-sm font-extrabold">
              {habit.currentStreak}
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.edit}
          onPress={onEdit}
          className="h-8 w-8 items-center justify-center rounded-lg"
        >
          <PencilIcon size={16} color={colors.ink['400']} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.delete}
          onPress={onDelete}
          className="h-8 w-8 items-center justify-center rounded-lg"
        >
          <TrashIcon size={16} color={colors.ink['400']} />
        </Pressable>
      </View>

      <WeekBar
        days={habit.recentDays}
        locale={locale}
        label={t.weekAria}
        toggleLabel={t.toggleDay}
        onToggle={onToggleDay}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.markDone}
        accessibilityState={{ selected: habit.doneToday }}
        onPress={onToggleDone}
        className={cn(
          'h-12 flex-row items-center justify-center gap-2 rounded-xl',
          habit.doneToday ? 'bg-brand-600' : 'border-line bg-surface border',
        )}
      >
        {habit.doneToday ? <CheckIcon size={17} color="#ffffff" /> : null}
        <Text
          className={cn(
            'text-sm font-semibold',
            habit.doneToday ? 'text-white' : 'text-ink-700',
          )}
        >
          {habit.doneToday ? t.checkDone : t.checkDo}
        </Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={onToggleActive}
        className="self-start"
      >
        <Text className="text-ink-400 text-xs font-medium">
          {habit.active ? t.pause : t.resume}
        </Text>
      </Pressable>
    </Card>
  )
}

export default function HabitsScreen() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const router = useRouter()
  const t = messages.habits
  const session = useSession()
  const list = useHabits()
  const createHabit = useCreateHabit()
  const updateHabit = useUpdateHabit()
  const deleteHabit = useDeleteHabit()
  const logHabit = useLogHabit()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const habits = list.data ?? []
  // Free includes a single habit; beyond that the add turns into an upsell.
  const atFreeCap =
    session.data?.plan === 'free' && habits.length >= 1 && !adding

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <View className="gap-1">
        <Text className="text-ink-900 text-2xl font-bold">{t.title}</Text>
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
      </View>

      {adding ? (
        <HabitForm
          isPending={createHabit.isPending}
          onSubmit={input =>
            createHabit.mutate(input, { onSuccess: () => setAdding(false) })
          }
          onCancel={() => setAdding(false)}
        />
      ) : atFreeCap ? (
        <View className="bg-brand-600 flex-row items-center gap-4 rounded-2xl p-5">
          <View className="min-w-0 flex-1">
            <View className="h-6 justify-center self-start rounded-full bg-white/20 px-2.5">
              <Text className="text-[11px] font-bold text-white">
                {t.freePlan}
              </Text>
            </View>
            <Text className="mt-2 text-[17px] font-bold text-white">
              {t.upsellTitle}
            </Text>
            <Text className="mt-1 text-[13.5px] text-white/85">
              {t.upsellBody}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/billing')}
            className="h-10 justify-center rounded-full bg-white px-5"
          >
            <Text className="text-brand-700 text-sm font-semibold">
              {t.upsellCta}
            </Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(true)}
          className="border-brand-300 h-[50px] flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed"
        >
          <PlusIcon size={17} color={colors.brand.accent} />
          <Text className="text-brand-accent text-sm font-semibold">
            {t.add}
          </Text>
        </Pressable>
      )}

      {list.isPending ? (
        <View className="gap-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </View>
      ) : null}

      {list.isError ? (
        <Card className="items-center gap-3 py-8">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button onPress={() => list.refetch()}>
            {messages.common.retry}
          </Button>
        </Card>
      ) : null}

      {list.isSuccess && habits.length === 0 && !adding ? (
        <Card className="items-center gap-3 px-6 py-11">
          <View className="bg-brand-50 h-16 w-16 items-center justify-center rounded-full">
            <FlameIcon size={30} color={colors.brand.accent} />
          </View>
          <Text className="text-ink-900 text-[17px] font-bold">
            {t.emptyTitle}
          </Text>
          <Text className="text-ink-500 text-center text-sm">
            {t.emptyBody}
          </Text>
          <Button onPress={() => setAdding(true)}>{t.emptyCta}</Button>
        </Card>
      ) : null}

      {list.isSuccess && habits.length > 0 ? (
        <View className="gap-4">
          {habits.map(habit =>
            editingId === habit.id ? (
              <HabitForm
                key={habit.id}
                initial={{
                  title: habit.title,
                  cadence: habit.cadence,
                  checkinHour: habit.checkinHour,
                }}
                isPending={updateHabit.isPending}
                onSubmit={input =>
                  updateHabit.mutate(
                    { id: habit.id, input },
                    { onSuccess: () => setEditingId(null) },
                  )
                }
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <HabitCard
                key={habit.id}
                habit={habit}
                locale={locale}
                t={t}
                onEdit={() => setEditingId(habit.id)}
                onToggleActive={() =>
                  updateHabit.mutate({
                    id: habit.id,
                    input: { active: !habit.active },
                  })
                }
                onDelete={() => deleteHabit.mutate(habit.id)}
                onToggleDone={() =>
                  logHabit.mutate({
                    id: habit.id,
                    input: { done: !habit.doneToday },
                  })
                }
                onToggleDay={(date, done) =>
                  logHabit.mutate({ id: habit.id, input: { date, done } })
                }
              />
            ),
          )}
        </View>
      ) : null}
    </Screen>
  )
}
