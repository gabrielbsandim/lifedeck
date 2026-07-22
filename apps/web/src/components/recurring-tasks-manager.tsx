'use client'

import { useState } from 'react'
import type { RecurringTaskView } from '@lifedeck/application'
import { Skeleton } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useUpdateRecurringTask,
} from '@/lib/api/use-recurring-tasks'
import {
  RecurringTaskForm,
  weekdayLabels,
} from '@/components/recurring-task-form'

function describeRule(
  rule: RecurringTaskView['rule'],
  locale: string,
  t: { interval: string; daily: string; weekly: string; monthly: string },
): string {
  const labels = weekdayLabels(locale)
  const every = t.interval
  if (rule.freq === 'weekly') {
    const days =
      rule.byWeekday && rule.byWeekday.length > 0
        ? rule.byWeekday.map(day => labels[day]).join(', ')
        : ''
    const base = rule.interval > 1 ? `${every} ${rule.interval} ×` : t.weekly
    return days ? `${base} · ${days}` : base
  }
  if (rule.freq === 'monthly') {
    const base = rule.interval > 1 ? `${every} ${rule.interval} ×` : t.monthly
    return rule.byMonthday ? `${base} · ${rule.byMonthday}` : base
  }
  return rule.interval > 1 ? `${every} ${rule.interval} ×` : t.daily
}

function RepeatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17 2l4 4-4 4M21 6H8a4 4 0 0 0-4 4M7 22l-4-4 4-4M3 18h13a4 4 0 0 0 4-4" />
    </svg>
  )
}

export function RecurringTasksManager() {
  const { messages, locale } = useI18n()
  const t = messages.recurring
  const list = useRecurringTasks()
  const createTask = useCreateRecurringTask()
  const updateTask = useUpdateRecurringTask()
  const deleteTask = useDeleteRecurringTask()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const definitions = list.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-ink-900 text-2xl font-bold tracking-tight">
          {t.title}
        </h1>
        <p className="text-ink-500 text-sm">{t.subtitle}</p>
      </header>

      {adding ? (
        <RecurringTaskForm
          isPending={createTask.isPending}
          onSubmit={input =>
            createTask.mutate(input, { onSuccess: () => setAdding(false) })
          }
          onCancel={() => setAdding(false)}
        />
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
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          <Skeleton className="h-[72px] w-full rounded-2xl" />
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

      {list.isSuccess && definitions.length === 0 && !adding && (
        <div className="border-line flex flex-col items-center gap-3 rounded-2xl border bg-white px-6 py-11 text-center">
          <span className="bg-brand-50 text-brand-600 flex h-16 w-16 items-center justify-center rounded-full">
            <RepeatIcon size={30} />
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

      {list.isSuccess && definitions.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {definitions.map(definition =>
            editingId === definition.id ? (
              <li key={definition.id}>
                <RecurringTaskForm
                  initial={{
                    title: definition.title,
                    rule: definition.rule,
                  }}
                  isPending={updateTask.isPending}
                  onSubmit={input =>
                    updateTask.mutate(
                      { id: definition.id, input },
                      { onSuccess: () => setEditingId(null) },
                    )
                  }
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={definition.id}
                className="border-line hover:border-ink-200 flex items-center gap-3.5 rounded-2xl border bg-white p-3.5 pl-4 shadow-sm transition-colors"
              >
                <span className="bg-brand-50 text-brand-600 flex h-10 w-10 flex-none items-center justify-center rounded-xl">
                  <RepeatIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-ink-900 truncate text-[15px] font-semibold">
                    {definition.title}
                  </p>
                  <p className="text-ink-500 mt-0.5 text-[13px]">
                    {describeRule(definition.rule, locale, t)}
                  </p>
                </div>
                <div className="flex flex-none gap-0.5">
                  <button
                    type="button"
                    aria-label={t.edit}
                    onClick={() => setEditingId(definition.id)}
                    className="text-brand-600 hover:bg-brand-50 flex h-9 w-9 items-center justify-center rounded-lg"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label={t.delete}
                    onClick={() => deleteTask.mutate(definition.id)}
                    className="text-ink-400 flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[oklch(0.58_0.21_25_/_0.08)] hover:text-[oklch(0.58_0.21_25)]"
                  >
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {list.hasNextPage && (
        <button
          type="button"
          disabled={list.isFetchingNextPage}
          onClick={() => list.fetchNextPage()}
          className="border-line text-ink-600 hover:bg-bg flex h-11 items-center justify-center self-start rounded-xl border bg-white px-6 text-sm font-semibold disabled:opacity-50"
        >
          {messages.common.loadMore}
        </button>
      )}
    </section>
  )
}
