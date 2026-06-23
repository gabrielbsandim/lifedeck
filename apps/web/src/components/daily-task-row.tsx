'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  MemberView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { Avatar, TaskCheckbox } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  GripIcon,
  LockIcon,
  NoteIcon,
  PlusIcon,
  RecurringIcon,
  UnlockIcon,
} from '@/components/icons'

const iconButtonClass =
  'flex h-8 w-7 flex-none items-center justify-center rounded-lg transition-colors sm:w-8'

// Secondary actions stay calm on desktop (revealed on hover/focus) but are
// always tappable on touch where there is no hover.
const revealClass =
  'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'

type AssigneeOption = { id: string; name: string }

type DailyTaskRowProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  sortable?: boolean
}

export function DailyTaskRow({
  task,
  members,
  self,
  onToggle,
  onUpdate,
  sortable = false,
}: DailyTaskRowProps) {
  const { messages, locale } = useI18n()
  const t = messages.task
  const completed = task.status === 'completed'
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.observation ?? '')

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: !sortable })

  const options: AssigneeOption[] = [
    ...(self ? [{ id: self.id, name: self.name }] : []),
    ...members
      .filter(member => member.userId !== self?.id)
      .map(member => ({ id: member.userId, name: member.displayName })),
  ]
  const assignee = options.find(option => option.id === task.assigneeId) ?? null

  function openNote() {
    setNoteDraft(task.observation ?? '')
    setEditingNote(true)
  }

  function saveNote() {
    const trimmed = noteDraft.trim()
    onUpdate(task.id, { observation: trimmed === '' ? null : trimmed })
    setEditingNote(false)
  }

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={`border-line group relative flex items-center gap-1.5 rounded-2xl border bg-white py-2.5 pl-1.5 pr-1.5 shadow-[0_1px_2px_rgba(70,60,90,0.05)] sm:gap-3 sm:pl-2 sm:pr-2.5 ${
        isDragging ? 'ring-brand-200 z-10 shadow-lg ring-1' : ''
      }`}
    >
      {sortable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={t.reorder}
          className="text-ink-300 hover:text-ink-500 flex h-7 w-4 flex-none cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:w-5"
          {...attributes}
          {...listeners}
        >
          <GripIcon />
        </button>
      )}

      <div className="pt-0.5">
        <TaskCheckbox
          checked={completed}
          label={task.title}
          onChange={() => onToggle(task)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={
            completed
              ? 'text-ink-500 block break-words text-sm line-through'
              : 'text-ink-800 block break-words text-sm font-medium'
          }
        >
          {task.title}
        </span>
        {task.carriedFromDate && (
          <span className="text-ink-400 text-xs">
            {messages.carryOver.broughtFrom.replace(
              '{date}',
              new Intl.DateTimeFormat(locale, {
                month: 'short',
                day: 'numeric',
                timeZone: 'UTC',
              }).format(new Date(`${task.carriedFromDate}T00:00:00.000Z`)),
            )}
          </span>
        )}
        {editingNote ? (
          <input
            autoFocus
            value={noteDraft}
            onChange={event => setNoteDraft(event.target.value)}
            onBlur={saveNote}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                saveNote()
              }
              if (event.key === 'Escape') {
                setNoteDraft(task.observation ?? '')
                setEditingNote(false)
              }
            }}
            placeholder={t.notePlaceholder}
            aria-label={t.note}
            maxLength={2000}
            className="border-line text-ink-700 focus-visible:border-brand-600 mt-1 w-full rounded-md border bg-white px-2 py-1 text-xs outline-none"
          />
        ) : task.observation ? (
          <button
            type="button"
            onClick={openNote}
            aria-label={t.editNote}
            className="text-ink-500 hover:text-ink-700 mt-1 flex max-w-full items-center gap-1.5 text-left text-xs"
          >
            <NoteIcon size={12} strokeWidth={2.5} />
            <span className="min-w-0 truncate">{task.observation}</span>
          </button>
        ) : null}
      </div>

      <div className="flex flex-none items-center gap-0.5 sm:gap-1">
        {task.recurringTaskId && (
          <span
            aria-hidden
            title={t.recurring}
            className="text-brand-400 flex h-8 w-5 items-center justify-center sm:w-6"
          >
            <RecurringIcon size={14} />
          </span>
        )}

        {!task.observation && !editingNote && (
          <button
            type="button"
            aria-label={t.addNote}
            onClick={openNote}
            className={`${iconButtonClass} text-ink-400 hover:text-ink-700 hover:bg-bg ${revealClass}`}
          >
            <NoteIcon size={15} />
          </button>
        )}

        <button
          type="button"
          aria-label={t.togglePrivacy}
          aria-pressed={task.isPrivate}
          title={task.isPrivate ? t.private : t.visible}
          onClick={() => onUpdate(task.id, { isPrivate: !task.isPrivate })}
          className={`${iconButtonClass} hover:bg-bg ${
            task.isPrivate
              ? 'text-brand-600'
              : `text-ink-400 hover:text-ink-700 ${revealClass}`
          }`}
        >
          {task.isPrivate ? <LockIcon size={15} /> : <UnlockIcon size={15} />}
        </button>

        {options.length > 0 && (
          <div className="relative h-7 w-7 flex-none">
            <span aria-hidden className="pointer-events-none absolute inset-0">
              {assignee ? (
                <Avatar name={assignee.name} size="sm" />
              ) : (
                <span className="border-line text-ink-400 flex h-7 w-7 items-center justify-center rounded-full border border-dashed">
                  <PlusIcon size={14} />
                </span>
              )}
            </span>
            <select
              aria-label={t.assignee}
              value={task.assigneeId ?? ''}
              onChange={event =>
                onUpdate(task.id, {
                  assigneeId:
                    event.target.value === '' ? null : event.target.value,
                })
              }
              className="absolute inset-0 cursor-pointer opacity-0"
            >
              <option value="">—</option>
              {options.map(option => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </li>
  )
}
