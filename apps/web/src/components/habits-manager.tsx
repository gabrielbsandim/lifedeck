'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { HabitView } from '@lifedeck/application'
import { Skeleton } from '@lifedeck/ui'
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

// A single-letter weekday initial for the trailing-week bar, derived from the
// civil date so it always matches the day the completion belongs to.
function weekdayInitial(locale: string, date: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'narrow',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00.000Z`))
}

// The trailing-week bar promoted to the card hero: one tall cell per day, filled
// with a check when done, dashed when scheduled-but-missed, faint when the
// cadence never asked for it. Today gets a ring and a bolder label so the eye
// lands on the day that's still actionable.
function WeekBar({
  days,
  locale,
  label,
}: {
  days: HabitView['recentDays']
  locale: string
  label: string
}) {
  return (
    <div className="flex gap-1.5" aria-label={label}>
      {days.map((day, index) => {
        const isToday = index === days.length - 1
        const cell = day.done
          ? 'bg-brand-500'
          : day.scheduled
            ? 'border-brand-300 bg-brand-50 border border-dashed'
            : 'bg-line'
        return (
          <div
            key={day.date}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <div
              title={day.date}
              className={`flex h-11 w-full items-center justify-center rounded-xl ${cell} ${
                isToday
                  ? 'ring-brand-300 ring-offset-surface ring-2 ring-offset-2'
                  : ''
              }`}
            >
              {day.done && (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </div>
            <span
              className={
                isToday
                  ? 'text-brand-700 text-[11px] font-bold'
                  : 'text-ink-400 text-[11px]'
              }
            >
              {weekdayInitial(locale, day.date)}
            </span>
          </div>
        )
      })}
    </div>
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
}: {
  habit: HabitView
  locale: string
  t: ReturnType<typeof useI18n>['messages']['habits']
  onEdit: () => void
  onToggleActive: () => void
  onDelete: () => void
  onToggleDone: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`border-line relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${
        habit.active ? '' : 'opacity-70'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                habit.active
                  ? 'text-ink-900 text-base font-bold'
                  : 'text-ink-500 text-base font-bold line-through'
              }
            >
              {habit.title}
            </span>
            {!habit.active && (
              <span className="bg-line text-ink-500 inline-flex h-5 items-center rounded-full px-2 text-[10.5px] font-bold tracking-wide">
                {t.paused.toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-ink-500 mt-0.5 text-[13px]">
            {describeCadence(habit.cadence, locale, t)}
          </div>
        </div>

        {habit.currentStreak > 0 && (
          <span
            className="inline-flex h-7 flex-none items-center gap-1 rounded-full pl-2.5 pr-2.5 text-sm font-extrabold"
            style={{
              background: 'oklch(0.72 0.17 60 / 0.14)',
              color: 'oklch(0.55 0.15 55)',
            }}
            title={t.streakAria}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .3-1.7.8-2.6C9 8 7.5 9.6 7.5 12.5A4.5 4.5 0 0 0 12 22a6 6 0 0 0 6-6c0-4.5-3.5-6.5-6-14z" />
            </svg>
            {habit.currentStreak}
          </span>
        )}

        <button
          type="button"
          aria-label={t.edit}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)}
          className="text-ink-400 hover:bg-bg flex h-8 w-8 flex-none items-center justify-center rounded-lg"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>

      <div className="my-4">
        <WeekBar days={habit.recentDays} locale={locale} label={t.weekAria} />
      </div>

      <button
        type="button"
        aria-label={t.markDone}
        aria-pressed={habit.doneToday}
        onClick={onToggleDone}
        className={
          habit.doneToday
            ? 'bg-brand-600 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-sm'
            : 'border-line text-ink-700 hover:border-brand-300 flex h-12 w-full items-center justify-center gap-2 rounded-xl border bg-white text-sm font-semibold'
        }
      >
        {habit.doneToday && (
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
        {habit.doneToday ? t.checkDone : t.checkDo}
      </button>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className="border-line absolute right-4 top-14 z-20 min-w-[168px] overflow-hidden rounded-2xl border bg-white shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onToggleActive()
              }}
              className="text-ink-800 hover:bg-bg flex w-full items-center gap-2.5 px-3.5 py-3 text-left text-sm"
            >
              <span className="text-ink-500 flex" aria-hidden>
                {habit.active ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="4" width="4" height="16" rx="1" />
                    <rect x="14" y="4" width="4" height="16" rx="1" />
                  </svg>
                ) : (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 4l14 8-14 8z" />
                  </svg>
                )}
              </span>
              {habit.active ? t.pause : t.resume}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onEdit()
              }}
              className="text-ink-800 border-line hover:bg-bg flex w-full items-center gap-2.5 border-t px-3.5 py-3 text-left text-sm"
            >
              <span className="text-ink-500 flex" aria-hidden>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </span>
              {t.edit}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false)
                onDelete()
              }}
              className="text-danger border-line flex w-full items-center gap-2.5 border-t px-3.5 py-3 text-left text-sm hover:bg-[oklch(0.58_0.21_25_/_0.07)]"
            >
              <span className="flex" aria-hidden>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                </svg>
              </span>
              {t.delete}
            </button>
          </div>
        </>
      )}
    </div>
  )
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
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink-900 text-2xl font-bold tracking-tight">
          {t.title}
        </h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>

      {adding ? (
        <HabitForm
          isPending={createHabit.isPending}
          onSubmit={input =>
            createHabit.mutate(input, { onSuccess: () => setAdding(false) })
          }
          onCancel={() => setAdding(false)}
        />
      ) : atFreeCap ? (
        <div className="from-brand-600 relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br to-[oklch(0.58_0.19_295)] p-5">
          <div className="min-w-0 flex-1">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-white/20 px-2.5 text-[11px] font-bold tracking-wide text-white">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                aria-hidden
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              {t.freePlan}
            </span>
            <div className="mt-2 text-[17px] font-bold text-white">
              {t.upsellTitle}
            </div>
            <p className="mt-1 max-w-md text-[13.5px] leading-snug text-white/85">
              {t.upsellBody}
            </p>
          </div>
          <Link
            href="/settings/billing"
            className="text-brand-700 flex h-10 flex-none items-center rounded-full bg-white px-5 text-sm font-semibold shadow-md"
          >
            {t.upsellCta}
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="border-brand-300 text-brand-600 hover:bg-brand-50 flex h-[50px] items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed bg-[oklch(0.97_0.02_280_/_0.5)] text-sm font-semibold"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t.add}
        </button>
      )}

      {list.isPending && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      )}

      {list.isError && (
        <div className="border-line flex flex-col items-center gap-3 rounded-2xl border bg-white py-8 text-center">
          <p className="text-ink-500 text-sm">{messages.common.error}</p>
          <button
            type="button"
            onClick={() => list.refetch()}
            className="bg-brand-600 flex h-10 items-center rounded-xl px-5 text-sm font-semibold text-white"
          >
            {messages.common.retry}
          </button>
        </div>
      )}

      {list.isSuccess && habits.length === 0 && !adding && (
        <div className="border-line flex flex-col items-center gap-3 rounded-2xl border bg-white px-6 py-11 text-center">
          <span className="bg-brand-50 text-brand-600 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .5-2 1-3M12 22a6 6 0 0 0 6-6c0-4-3-6-6-11-3 5-6 7-6 11a6 6 0 0 0 6 6z" />
            </svg>
          </span>
          <div>
            <div className="text-ink-900 text-[17px] font-bold">
              {t.emptyTitle}
            </div>
            <p className="text-ink-500 mx-auto mt-1 max-w-xs text-sm leading-snug">
              {t.emptyBody}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="bg-brand-600 flex h-11 items-center rounded-xl px-5 text-sm font-semibold text-white"
          >
            {t.emptyCta}
          </button>
        </div>
      )}

      {list.isSuccess && habits.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {habits.map(habit =>
            editingId === habit.id ? (
              <div key={habit.id} className="sm:col-span-2">
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
              </div>
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
              />
            ),
          )}
        </div>
      )}
    </section>
  )
}
