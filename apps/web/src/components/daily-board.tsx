'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import type { TaskView, UpdateTaskInput } from '@taskin/application'
import {
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Skeleton,
  TextField,
} from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateTask,
  useDailyBoard,
  useUpdateTask,
} from '@/lib/api/use-daily-board'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow } from '@/components/daily-task-row'
import { AccountMenu } from '@/components/account-menu'

function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

export function DailyBoard({ date }: { date: string }) {
  const { messages, locale } = useI18n()
  const board = useDailyBoard(date)
  const session = useSession()
  const listId = board.data?.list.id ?? ''
  const members = useMembers(listId, listId !== '')
  const createTask = useCreateTask(date)
  const updateTask = useUpdateTask(date)
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  if (board.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }
  if (board.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-ink-500 text-sm">{messages.common.error}</p>
        <Button variant="ghost" onClick={() => board.refetch()}>
          {messages.common.retry}
        </Button>
      </Card>
    )
  }

  const { list, tasks } = board.data
  const doneCount = tasks.filter(task => task.status === 'completed').length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const allDone = tasks.length > 0 && doneCount === tasks.length
  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(tasks.length))

  function addTask(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createTask.mutate(
      { listId: list.id, title: trimmed },
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
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-brand-600 text-sm font-medium">
            {messages.app.name}
          </p>
          <AccountMenu />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {messages.app.tagline}
        </h1>
      </header>

      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-ink-500 text-sm capitalize">
              {formatDate(date, locale)}
            </p>
            <h2 className="text-xl font-semibold">{messages.list.daily}</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              {messages.list.share}
            </button>
            <Link
              href="/lists"
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              {messages.lists.manage}
            </Link>
            <Link
              href="/analytics"
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              {messages.analytics.manage}
            </Link>
            <Link
              href="/recurring"
              className="text-brand-600 hover:text-brand-700 text-sm font-medium"
            >
              ↻ {messages.recurring.manage}
            </Link>
          </div>
        </div>

        <ShareDialog
          listId={list.id}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        <div className="border-line bg-bg mb-6 rounded-2xl border p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-ink-700 text-sm font-medium">
              {progressLabel}
            </span>
            <span className="text-brand-600 text-xl font-bold">{pct}%</span>
          </div>
          <ProgressBar value={pct} label={progressLabel} />
          <AnimatePresence>
            {allDone && (
              <motion.p
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden text-sm font-semibold text-violet-500"
              >
                {messages.task.allDone}
              </motion.p>
            )}
          </AnimatePresence>
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

        {tasks.length === 0 ? (
          <EmptyState title={messages.task.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map(task => (
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
