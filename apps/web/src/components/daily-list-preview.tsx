'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar, Card, ProgressBar, TaskCheckbox, TextField } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'

type PreviewTask = {
  id: string
  title: string
  assignee: string
  done: boolean
}

const INITIAL_TASKS: PreviewTask[] = [
  { id: '1', title: 'Choose the wedding cake', assignee: 'Maria', done: true },
  { id: '2', title: 'Confirm the venue', assignee: 'Ana', done: true },
  { id: '3', title: 'Finalize the guest list', assignee: 'Maria', done: false },
  { id: '4', title: 'Send the invitations', assignee: 'Ana', done: false },
  {
    id: '5',
    title: 'Build reception playlist',
    assignee: 'Maria',
    done: false,
  },
]

export function DailyListPreview() {
  const { messages } = useI18n()
  const [tasks, setTasks] = useState(INITIAL_TASKS)

  const doneCount = tasks.filter(task => task.done).length
  const pct = useMemo(
    () => Math.round((doneCount / tasks.length) * 100),
    [doneCount, tasks.length],
  )
  const allDone = doneCount === tasks.length

  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(tasks.length))

  function toggle(id: string) {
    setTasks(current =>
      current.map(task =>
        task.id === id ? { ...task, done: !task.done } : task,
      ),
    )
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-brand-600 text-sm font-medium">
          {messages.app.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {messages.app.tagline}
        </h1>
      </header>

      <Card className="p-6 sm:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-ink-500 text-sm">Saturday, June 21</p>
            <h2 className="text-xl font-semibold">{messages.list.daily}</h2>
          </div>
          <div className="flex">
            <Avatar
              name="Maria"
              tone="brand"
              size="sm"
              className="ring-2 ring-white"
            />
            <Avatar
              name="Ana"
              tone="violet"
              size="sm"
              className="-ml-2.5 ring-2 ring-white"
            />
          </div>
        </div>

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

        <div className="mb-4">
          <TextField
            placeholder={messages.task.add}
            aria-label={messages.task.add}
          />
        </div>

        <ul className="flex flex-col gap-2">
          {tasks.map(task => (
            <li
              key={task.id}
              className="border-line flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3"
            >
              <TaskCheckbox
                checked={task.done}
                label={task.title}
                onChange={() => toggle(task.id)}
              />
              <span
                className={
                  task.done
                    ? 'text-ink-500 flex-1 text-sm line-through'
                    : 'text-ink-800 flex-1 text-sm'
                }
              >
                {task.title}
              </span>
              <Avatar
                name={task.assignee}
                tone={task.assignee === 'Ana' ? 'violet' : 'brand'}
                size="sm"
              />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  )
}
