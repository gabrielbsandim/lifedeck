'use client'

import { useState } from 'react'
import type { RecurringTaskView } from '@lifedeck/application'
import { Button, Card, EmptyState, Skeleton } from '@lifedeck/ui'
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

export function RecurringTasksManager() {
  const { messages, locale } = useI18n()
  const list = useRecurringTasks()
  const createTask = useCreateRecurringTask()
  const updateTask = useUpdateRecurringTask()
  const deleteTask = useDeleteRecurringTask()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.recurring.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.recurring.subtitle}</p>
      </header>

      <Card className="flex flex-col gap-4 p-6 sm:p-8">
        {adding ? (
          <RecurringTaskForm
            isPending={createTask.isPending}
            onSubmit={input =>
              createTask.mutate(input, { onSuccess: () => setAdding(false) })
            }
            onCancel={() => setAdding(false)}
          />
        ) : (
          <Button onClick={() => setAdding(true)}>
            {messages.recurring.add}
          </Button>
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

        {list.isSuccess && list.data.length === 0 && !adding && (
          <EmptyState title={messages.recurring.empty} />
        )}

        {list.isSuccess && list.data.length > 0 && (
          <ul className="flex flex-col gap-2">
            {list.data.map(definition =>
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
                  className="border-line flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3"
                >
                  <div className="flex-1">
                    <p className="text-ink-800 text-sm font-medium">
                      {definition.title}
                    </p>
                    <p className="text-ink-500 text-xs">
                      {describeRule(
                        definition.rule,
                        locale,
                        messages.recurring,
                      )}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    onClick={() => setEditingId(definition.id)}
                  >
                    {messages.recurring.edit}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger h-9 px-3"
                    onClick={() => deleteTask.mutate(definition.id)}
                  >
                    {messages.recurring.delete}
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
