'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { QueryKey } from '@tanstack/react-query'
import type {
  MemberView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { TaskCheckbox, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useUpdateSubtask,
} from '@/lib/api/use-subtasks'
import {
  CloseIcon,
  LockIcon,
  PlusIcon,
  RecurringIcon,
  TrashIcon,
  UserIcon,
} from '@/components/icons'

type AssigneeOption = { id: string; name: string }

export type TaskSheetProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  boardKey: QueryKey
  open: boolean
  onClose: () => void
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onDelete?: (task: TaskView) => void
}

function SubtaskSection({
  taskId,
  boardKey,
}: {
  taskId: string
  boardKey: QueryKey
}) {
  const { messages } = useI18n()
  const query = useSubtasks(taskId, true)
  const createSubtask = useCreateSubtask(taskId, boardKey)
  const updateSubtask = useUpdateSubtask(taskId, boardKey)
  const deleteSubtask = useDeleteSubtask(taskId, boardKey)
  const subtasks = query.data ?? []
  const [draft, setDraft] = useState('')

  function add(event: FormEvent) {
    event.preventDefault()
    const trimmed = draft.trim()
    if (!trimmed) {
      return
    }
    createSubtask.mutate({ title: trimmed })
    setDraft('')
  }

  return (
    <div className="border-line overflow-hidden rounded-2xl border">
      {subtasks.map(subtask => {
        const completed = subtask.status === 'completed'
        return (
          <div
            key={subtask.id}
            className="border-line/60 relative flex min-h-[46px] items-center gap-2.5 border-b pl-3.5 pr-1.5 last:border-b-0"
          >
            <button
              type="button"
              role="checkbox"
              aria-checked={completed}
              aria-label={subtask.title}
              onClick={() =>
                updateSubtask.mutate({
                  id: subtask.id,
                  input: { status: completed ? 'pending' : 'completed' },
                })
              }
              className={cn(
                'flex h-5 w-5 flex-none items-center justify-center rounded-[7px] border-2 transition-colors',
                completed
                  ? 'border-brand-600 bg-brand-600'
                  : 'border-ink-500/40 bg-white',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                className={cn(
                  'h-3 w-3 text-white',
                  completed ? '' : 'opacity-0',
                )}
              >
                <path
                  d="M20 6L9 17l-5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span
              className={cn(
                'min-w-0 flex-1 break-words text-sm',
                completed ? 'text-ink-400 line-through' : 'text-ink-800',
              )}
            >
              {subtask.title}
            </span>
            <button
              type="button"
              aria-label={messages.subtask.delete}
              onClick={() => deleteSubtask.mutate(subtask.id)}
              className="text-ink-300 hover:text-danger flex h-8 w-8 flex-none items-center justify-center transition-colors"
            >
              <CloseIcon size={13} />
            </button>
          </div>
        )
      })}

      <form
        onSubmit={add}
        className="flex min-h-[46px] items-center gap-2.5 px-3.5"
      >
        <span className="text-ink-300 flex h-5 w-5 flex-none items-center justify-center">
          <PlusIcon size={14} strokeWidth={2.4} />
        </span>
        <input
          value={draft}
          onChange={event => setDraft(event.target.value)}
          placeholder={messages.subtask.add}
          aria-label={messages.subtask.add}
          maxLength={280}
          className="text-ink-800 h-11 min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
        />
      </form>
    </div>
  )
}

export function TaskSheet({
  task,
  members,
  self,
  boardKey,
  open,
  onClose,
  onToggle,
  onUpdate,
  onDelete,
}: TaskSheetProps) {
  const { messages } = useI18n()
  const t = messages.task
  const completed = task.status === 'completed'
  const panelRef = useRef<HTMLDivElement>(null)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [noteDraft, setNoteDraft] = useState(task.observation ?? '')
  const [prevTaskId, setPrevTaskId] = useState(task.id)

  // Reset local drafts when a different task loads into this sheet, using the
  // render-time adjustment pattern rather than an effect.
  if (task.id !== prevTaskId) {
    setPrevTaskId(task.id)
    setTitleDraft(task.title)
    setNoteDraft(task.observation ?? '')
  }

  useEffect(() => {
    if (!open) {
      return
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const subtaskTotal = task.subtasks.total
  const subtaskDone = task.subtasks.completed

  const options: AssigneeOption[] = [
    ...(self ? [{ id: self.id, name: self.name }] : []),
    ...members
      .filter(member => member.userId !== self?.id)
      .map(member => ({ id: member.userId, name: member.displayName })),
  ]

  function saveTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    } else {
      setTitleDraft(task.title)
    }
  }

  function saveNote() {
    const trimmed = noteDraft.trim()
    const next = trimmed === '' ? null : trimmed
    if (next !== (task.observation ?? null)) {
      onUpdate(task.id, { observation: next })
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label={messages.share.close}
            onClick={onClose}
            className="bg-ink-900/40 absolute inset-0"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={task.title}
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="relative mx-auto max-h-[86%] w-full overflow-y-auto rounded-t-[24px] bg-white px-[18px] pb-9 pt-2.5 shadow-[0_-12px_40px_rgba(40,30,60,0.2)] sm:max-w-md"
          >
            <div
              aria-hidden
              className="bg-line mx-auto mb-3.5 h-1 w-10 rounded-full"
            />

            <div className="flex items-start gap-3">
              <div className="mt-1">
                <TaskCheckbox
                  checked={completed}
                  label={task.title}
                  onChange={() => onToggle(task)}
                />
              </div>
              <input
                value={titleDraft}
                onChange={event => setTitleDraft(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    event.currentTarget.blur()
                  }
                }}
                aria-label={t.editTitle}
                maxLength={280}
                className={cn(
                  'min-w-0 flex-1 border-none bg-transparent py-1 text-[17px] font-semibold outline-none',
                  completed ? 'text-ink-500 line-through' : 'text-ink-900',
                )}
              />
            </div>

            {task.recurringTaskId && (
              <div className="ml-[38px] mt-1.5">
                <span className="bg-brand-50 text-brand-700 inline-flex h-[22px] items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-bold">
                  <RecurringIcon size={11} strokeWidth={2.4} />
                  {t.recurring}
                </span>
              </div>
            )}

            <p className="text-ink-500 pb-1.5 pt-4 text-xs font-semibold uppercase tracking-[0.08em]">
              {t.noteSection}
            </p>
            <input
              value={noteDraft}
              onChange={event => setNoteDraft(event.target.value)}
              onBlur={saveNote}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  event.currentTarget.blur()
                }
              }}
              placeholder={t.notePlaceholder}
              aria-label={t.note}
              maxLength={2000}
              className="border-line text-ink-700 focus:border-brand-600 h-[46px] w-full rounded-[13px] border-[1.5px] bg-[oklch(0.985_0.004_265)] px-3.5 text-sm outline-none focus:bg-white"
            />

            <div className="flex items-baseline justify-between pb-1.5 pt-4">
              <p className="text-ink-500 text-xs font-semibold uppercase tracking-[0.08em]">
                {messages.subtask.title}
              </p>
              {subtaskTotal > 0 && (
                <span className="text-ink-400 text-xs">
                  {messages.subtask.progress
                    .replace('{done}', String(subtaskDone))
                    .replace('{total}', String(subtaskTotal))}
                </span>
              )}
            </div>
            <SubtaskSection taskId={task.id} boardKey={boardKey} />

            <div className="border-line mt-4 overflow-hidden rounded-2xl border">
              <div className="border-line/60 relative flex min-h-[50px] items-center gap-2.5 border-b px-3.5">
                <span className="text-ink-500 flex flex-none">
                  <LockIcon size={16} />
                </span>
                <span className="text-ink-800 flex-1 text-sm">{t.private}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={task.isPrivate}
                  aria-label={t.togglePrivacy}
                  onClick={() =>
                    onUpdate(task.id, { isPrivate: !task.isPrivate })
                  }
                  className={cn(
                    'relative h-[29px] w-12 flex-none rounded-full transition-colors',
                    task.isPrivate ? 'bg-brand-600' : 'bg-ink-500/25',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-[2.5px] h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[left]',
                      task.isPrivate ? 'left-[21px]' : 'left-[2.5px]',
                    )}
                  />
                </button>
              </div>
              {options.length > 0 && (
                <div className="flex min-h-[54px] flex-wrap items-center gap-2.5 px-3.5 py-2">
                  <span className="text-ink-500 flex flex-none">
                    <UserIcon size={16} />
                  </span>
                  <span className="text-ink-800 flex-1 text-sm">
                    {t.assignee}
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {options.map(option => {
                      const active = task.assigneeId === option.id
                      const label = option.name.trim().split(/\s+/)[0]
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            onUpdate(task.id, {
                              assigneeId: active ? null : option.id,
                            })
                          }
                          className={cn(
                            'h-[30px] rounded-full border-[1.5px] px-2.5 text-[12.5px] font-semibold transition-colors',
                            active
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-line text-ink-600 bg-white',
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </span>
                </div>
              )}
            </div>
            <p className="text-ink-400 mt-2 px-0.5 text-xs">{t.privacyHint}</p>

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(task)
                  onClose()
                }}
                className="text-danger mt-3.5 flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-[oklch(0.58_0.21_25_/_0.08)] text-sm font-semibold transition-colors hover:bg-[oklch(0.58_0.21_25_/_0.14)]"
              >
                <TrashIcon size={15} />
                {t.delete}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
