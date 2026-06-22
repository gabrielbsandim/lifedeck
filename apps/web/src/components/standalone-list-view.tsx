'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { TaskView, UpdateTaskInput } from '@taskin/application'
import { Card, EmptyState, ProgressBar, Skeleton, TextField } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useMembers } from '@/lib/api/use-share'
import {
  useCreateListTask,
  useList,
  useListTasks,
  useUpdateListTask,
} from '@/lib/api/use-lists'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow } from '@/components/daily-task-row'

export function StandaloneListView({ listId }: { listId: string }) {
  const { messages } = useI18n()
  const list = useList(listId)
  const tasks = useListTasks(listId)
  const session = useSession()
  const members = useMembers(listId, listId !== '')
  const createTask = useCreateListTask(listId)
  const updateTask = useUpdateListTask(listId)
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  if (list.isPending || tasks.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }
  if (list.isError || tasks.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-ink-500 text-sm">{messages.common.error}</p>
        <Link href="/lists" className="text-brand-600 text-sm font-medium">
          {messages.lists.back}
        </Link>
      </Card>
    )
  }

  const rows = tasks.data
  const doneCount = rows.filter(task => task.status === 'completed').length
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0
  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(rows.length))

  function addTask(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createTask.mutate(
      { listId, title: trimmed },
      { onSuccess: () => setTitle('') },
    )
  }

  function toggle(task: TaskView) {
    updateTask.mutate({
      id: task.id,
      input: {
        status: task.status === 'completed' ? 'pending' : 'completed',
      },
    })
  }

  function update(id: string, input: UpdateTaskInput) {
    updateTask.mutate({ id, input })
  }

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/lists" className="text-brand-600 text-sm font-medium">
          ← {messages.lists.back}
        </Link>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {list.data.title}
          </h1>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            {messages.list.share}
          </button>
        </div>
      </header>

      <ShareDialog
        listId={listId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <Card className="p-6 sm:p-8">
        <div className="border-line bg-bg mb-6 rounded-2xl border p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-ink-700 text-sm font-medium">
              {progressLabel}
            </span>
            <span className="text-brand-600 text-xl font-bold">{pct}%</span>
          </div>
          <ProgressBar value={pct} label={progressLabel} />
        </div>

        <form onSubmit={addTask} className="mb-4">
          <TextField
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={messages.task.add}
            aria-label={messages.task.add}
            maxLength={280}
          />
        </form>

        {rows.length === 0 ? (
          <EmptyState title={messages.task.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map(task => (
              <DailyTaskRow
                key={task.id}
                task={task}
                members={members.data ?? []}
                self={self}
                onToggle={toggle}
                onUpdate={update}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
