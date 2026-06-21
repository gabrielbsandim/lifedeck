'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, TaskCheckbox } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'

type PreviewTask = {
  id: string
  title: string
  done: boolean
}

const INITIAL_TASKS: PreviewTask[] = [
  { id: '1', title: 'Book the venue tasting', done: true },
  { id: '2', title: 'Send save-the-dates', done: false },
  { id: '3', title: 'Finalize the playlist', done: false },
]

export function DailyListPreview() {
  const { messages } = useI18n()
  const [tasks, setTasks] = useState(INITIAL_TASKS)

  const completion = useMemo(() => {
    const done = tasks.filter(task => task.done).length
    return Math.round((done / tasks.length) * 100)
  }, [tasks])

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
        <p className="text-sm font-medium text-indigo-600">
          {messages.app.name}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {messages.app.tagline}
        </h1>
      </header>

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{messages.list.daily}</h2>
          <span className="text-sm text-slate-500">{completion}%</span>
        </div>

        <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-indigo-600"
            initial={false}
            animate={{ width: `${completion}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>

        <ul className="flex flex-col gap-3">
          {tasks.map(task => (
            <li key={task.id} className="flex items-center gap-3">
              <TaskCheckbox
                checked={task.done}
                label={task.title}
                onChange={() => toggle(task.id)}
              />
              <span
                className={
                  task.done ? 'text-slate-400 line-through' : 'text-slate-800'
                }
              >
                {task.title}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button>{messages.task.add}</Button>
        </div>
      </div>
    </section>
  )
}
