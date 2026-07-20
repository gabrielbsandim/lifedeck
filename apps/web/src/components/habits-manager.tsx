'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HabitView } from '@lifedeck/application'
import { Button, Card, EmptyState, Skeleton } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import {
  useCreateHabit,
  useDeleteHabit,
  useHabits,
  useLogHabit,
  useUpdateHabit,
} from '@/lib/api/use-habits'
import { HabitForm } from '@/components/habit-form'
import { weekdayLabels } from '@/components/recurring-task-form'

function describeCadence(
  cadence: HabitView['cadence'],
  locale: string,
  t: { daily: string; timesPerWeekUnit: string },
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

export function HabitsManager() {
  const { messages, locale } = useI18n()
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
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        {adding ? (
          <HabitForm
            isPending={createHabit.isPending}
            onSubmit={input =>
              createHabit.mutate(input, { onSuccess: () => setAdding(false) })
            }
            onCancel={() => setAdding(false)}
          />
        ) : atFreeCap ? (
          <div className="border-brand-200 bg-brand-50 flex flex-col gap-2 rounded-2xl border p-4">
            <p className="text-ink-800 text-sm font-medium">{t.upsellTitle}</p>
            <p className="text-ink-600 text-sm">{t.upsellBody}</p>
            <Link
              href="/settings/billing"
              className="border-brand-300 text-brand-700 mt-1 inline-flex w-fit items-center rounded-lg border px-3 py-1.5 text-sm font-medium"
            >
              {t.upsellCta}
            </Link>
          </div>
        ) : (
          <Button onClick={() => setAdding(true)}>{t.add}</Button>
        )}

        {list.isPending && <Skeleton className="h-24 w-full rounded-2xl" />}

        {list.isError && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-ink-500 text-sm">{messages.common.error}</p>
            <Button variant="ghost" onClick={() => list.refetch()}>
              {messages.common.retry}
            </Button>
          </div>
        )}

        {list.isSuccess && habits.length === 0 && !adding && (
          <EmptyState title={t.empty} />
        )}

        {list.isSuccess && habits.length > 0 && (
          <ul className="flex flex-col gap-2">
            {habits.map(habit =>
              editingId === habit.id ? (
                <li key={habit.id}>
                  <HabitForm
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
                </li>
              ) : (
                <li
                  key={habit.id}
                  className="border-line flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3"
                >
                  <button
                    type="button"
                    aria-label={t.markDone}
                    aria-pressed={habit.doneToday}
                    onClick={() =>
                      logHabit.mutate({
                        id: habit.id,
                        input: { done: !habit.doneToday },
                      })
                    }
                    className={
                      habit.doneToday
                        ? 'bg-brand-600 flex h-8 w-8 items-center justify-center rounded-full text-sm text-white'
                        : 'border-line text-ink-400 flex h-8 w-8 items-center justify-center rounded-full border bg-white text-sm'
                    }
                  >
                    ✓
                  </button>
                  <div className="flex-1">
                    <p
                      className={
                        habit.active
                          ? 'text-ink-800 text-sm font-medium'
                          : 'text-ink-400 text-sm font-medium line-through'
                      }
                    >
                      {habit.title}
                    </p>
                    <p className="text-ink-500 text-xs">
                      {describeCadence(habit.cadence, locale, t)}
                      {habit.currentStreak > 0 &&
                        ` · 🔥 ${habit.currentStreak} ${t.streak}`}
                      {!habit.active && ` · ${t.paused}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() =>
                      updateHabit.mutate({
                        id: habit.id,
                        input: { active: !habit.active },
                      })
                    }
                  >
                    {habit.active ? t.pause : t.resume}
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() => setEditingId(habit.id)}
                  >
                    {t.edit}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger h-9 px-3"
                    onClick={() => deleteHabit.mutate(habit.id)}
                  >
                    {t.delete}
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>
    </section>
  )
}
