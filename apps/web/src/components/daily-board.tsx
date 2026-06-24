'use client'

import { useRef, useState, type FormEvent, type TouchEvent } from 'react'
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
  useDeleteDailyTask,
  useReorderDailyTasks,
  useUpdateTask,
} from '@/lib/api/use-daily-board'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow, DailyTaskRowOverlay } from '@/components/daily-task-row'
import { TaskDragList } from '@/components/task-drag-list'
import { NotificationBell } from '@/components/notification-bell'
import {
  CalendarIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ShareIcon,
  UndoIcon,
} from '@/components/icons'
import { addDays, todayIso } from '@/lib/api/dates'

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

function greetingFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function DailyBoard({
  date,
  onDateChange,
}: {
  date: string
  onDateChange: (date: string) => void
}) {
  const { messages, locale } = useI18n()
  const board = useDailyBoard(date)
  const session = useSession()
  const listId = board.data?.list.id ?? ''
  const members = useMembers(listId, listId !== '')
  const createTask = useCreateTask(date)
  const updateTask = useUpdateTask(date)
  const deleteTask = useDeleteDailyTask(date)
  const reorderTasks = useReorderDailyTasks(date, listId)
  const bringTask = useBringTaskToToday(date)
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const dateInput = useRef<HTMLInputElement>(null)

  const today = todayIso()
  const isToday = date === today
  const goToPreviousDay = () => onDateChange(addDays(date, -1))
  const goToNextDay = () => {
    if (!isToday) {
      onDateChange(addDays(date, 1))
    }
  }

  function onTouchStart(event: TouchEvent) {
    const point = event.touches[0]
    touchStart.current = point ? { x: point.clientX, y: point.clientY } : null
  }

  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    const point = event.changedTouches[0]
    if (!start || !point) {
      return
    }
    const dx = point.clientX - start.x
    const dy = point.clientY - start.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) {
      return
    }
    if (dx > 0) {
      goToPreviousDay()
    } else {
      goToNextDay()
    }
  }

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
  // Keep unchecked tasks first and move completed ones to the end, preserving
  // their relative order within each group (Array.prototype.sort is stable).
  const rows = [...tasks].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed'),
  )
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

  function removeTask(task: TaskView) {
    deleteTask.mutate(task.id)
  }

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null
  const firstName = session.data?.displayName.trim().split(/\s+/)[0] ?? ''
  const greeting = messages.home[greetingFor(new Date().getHours())]

  return (
    <section
      className="flex flex-col gap-6"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoMark size={20} title={messages.app.name} />
            <p className="text-brand-600 text-sm font-medium">
              {messages.app.name}
            </p>
          </div>
          <NotificationBell />
        </div>
        <div className="flex flex-col gap-1.5">
          <h1
            suppressHydrationWarning
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goToPreviousDay}
              aria-label={messages.home.previousDay}
              className="text-ink-400 hover:text-ink-700 hover:bg-bg -ml-1 flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors"
            >
              <ChevronLeftIcon size={18} />
            </button>
            <div className="relative">
              <button
                type="button"
                aria-label={messages.home.pickDate}
                onClick={() => {
                  try {
                    dateInput.current?.showPicker()
                  } catch {
                    dateInput.current?.focus()
                  }
                }}
                className="text-ink-500 hover:text-ink-700 flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 text-sm font-medium capitalize transition-colors"
              >
                <CalendarIcon size={14} />
                {formatDate(date, locale)}
              </button>
              <input
                ref={dateInput}
                type="date"
                value={date}
                max={today}
                onChange={event => {
                  if (event.target.value) {
                    onDateChange(event.target.value)
                  }
                }}
                aria-hidden
                tabIndex={-1}
                className="pointer-events-none absolute inset-0 opacity-0"
              />
            </div>
            <button
              type="button"
              onClick={goToNextDay}
              disabled={isToday}
              aria-label={messages.home.nextDay}
              className="text-ink-400 hover:text-ink-700 hover:bg-bg flex h-7 w-7 flex-none items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-30"
            >
              <ChevronRightIcon size={18} />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => onDateChange(today)}
                className="text-brand-600 hover:bg-brand-50 ml-1 rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors"
              >
                {messages.home.goToToday}
              </button>
            )}
          </div>
        </div>
      </header>

      <ShareDialog
        listId={list.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <Card className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="relative">
          <Celebration active={allDone} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-brand-600 text-3xl font-extrabold leading-none tracking-tight">
                {pct}%
              </span>
              <span className="text-ink-500 text-sm">{progressLabel}</span>
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
          <ProgressBar value={pct} label={progressLabel} className="mt-3" />
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

        <form onSubmit={addTask}>
          <TextField
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={messages.task.add}
            aria-label={messages.task.add}
            maxLength={280}
          />
        </form>

        {carryOver.length > 0 && (
          <div className="border-line bg-bg rounded-2xl border p-4">
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
          <EmptyState
            icon={<CheckSquareIcon size={22} />}
            title={messages.task.empty}
            description={messages.task.emptyHint}
          />
        ) : (
          <TaskDragList
            items={rows}
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
                onDelete: removeTask,
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
