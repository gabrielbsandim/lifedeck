'use client'

import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TaskView, UpdateTaskInput } from '@lifedeck/application'
import {
  Button,
  Card,
  Celebration,
  EmptyState,
  LogoMark,
  ProgressBar,
  Skeleton,
  TextField,
} from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useBringTaskToToday,
  useCreateTask,
  useDailyBoard,
  useReorderDailyTasks,
  useUpdateTask,
} from '@/lib/api/use-daily-board'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow, DailyTaskRowOverlay } from '@/components/daily-task-row'
import { TaskDragList } from '@/components/task-drag-list'
import { NotificationBell } from '@/components/notification-bell'
import { ShareIcon, UndoIcon } from '@/components/icons'

function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

function formatShortDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
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
  const reorderTasks = useReorderDailyTasks(date, listId)
  const bringTask = useBringTaskToToday(date)
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

  const { list, tasks, carryOver } = board.data
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
          <div className="flex items-center gap-2">
            <LogoMark size={20} title={messages.app.name} />
            <p className="text-brand-600 text-sm font-medium">
              {messages.app.name}
            </p>
          </div>
          <NotificationBell />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {messages.app.tagline}
        </h1>
      </header>

      <Card className="p-4 sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <p className="text-ink-500 text-sm capitalize">
              {formatDate(date, locale)}
            </p>
            <h2 className="text-xl font-semibold">{messages.list.daily}</h2>
          </div>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="bg-brand-600 hover:bg-brand-700 flex h-9 flex-none items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white"
          >
            <ShareIcon size={15} />
            {messages.list.share}
          </button>
        </div>

        <ShareDialog
          listId={list.id}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />

        <div className="border-line bg-bg relative mb-6 rounded-2xl border p-4">
          <Celebration active={allDone} />
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

        {carryOver.length > 0 && (
          <div className="border-line bg-bg mb-4 rounded-2xl border p-4">
            <p className="text-ink-700 mb-3 text-sm font-semibold">
              {messages.carryOver.pendingTitle}
            </p>
            <ul className="flex flex-col gap-2">
              {carryOver.map(item => (
                <li
                  key={item.task.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-ink-800 truncate text-sm">
                      {item.task.title}
                    </span>
                    <span className="text-ink-400 text-xs">
                      {messages.carryOver.broughtFrom.replace(
                        '{date}',
                        formatShortDate(item.fromDate, locale),
                      )}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    className="flex h-8 flex-none items-center gap-1.5 px-2 text-xs"
                    isLoading={
                      bringTask.isPending &&
                      bringTask.variables === item.task.id
                    }
                    onClick={() => bringTask.mutate(item.task.id)}
                  >
                    <UndoIcon size={14} />
                    {messages.carryOver.bring}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tasks.length === 0 ? (
          <EmptyState title={messages.task.empty} />
        ) : (
          <TaskDragList
            items={tasks}
            getId={task => task.id}
            onReorder={ids => reorderTasks.mutate(ids)}
            className="flex flex-col gap-2"
            renderItem={(task, { overlay }) => {
              const rowProps = {
                task,
                members: members.data ?? [],
                self,
                onToggle: toggle,
                onUpdate: update,
              }
              return overlay ? (
                <DailyTaskRowOverlay {...rowProps} />
              ) : (
                <DailyTaskRow key={task.id} {...rowProps} />
              )
            }}
          />
        )}
      </Card>
    </section>
  )
}
