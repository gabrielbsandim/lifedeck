'use client'

import { useState } from 'react'
import type { MemberView, TaskView, UpdateTaskInput } from '@taskin/application'
import { Avatar, TaskCheckbox } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'

const iconButtonClass =
  'flex h-8 w-8 flex-none items-center justify-center rounded-lg'

type AssigneeOption = { id: string; name: string }

type DailyTaskRowProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onMove?: (direction: 'up' | 'down') => void
  canMoveUp?: boolean
  canMoveDown?: boolean
}

function MessageIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}

export function DailyTaskRow({
  task,
  members,
  self,
  onToggle,
  onUpdate,
  onMove,
  canMoveUp = false,
  canMoveDown = false,
}: DailyTaskRowProps) {
  const { messages, locale } = useI18n()
  const t = messages.task
  const completed = task.status === 'completed'
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.observation ?? '')

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
    <li className="border-line flex flex-col gap-2 rounded-xl border bg-white px-3.5 py-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {onMove && (
          <div className="flex flex-none flex-col pt-0.5">
            <button
              type="button"
              aria-label={t.moveUp}
              disabled={!canMoveUp}
              onClick={() => onMove('up')}
              className="text-ink-400 hover:text-ink-700 flex h-5 w-6 items-center justify-center text-xs leading-none disabled:opacity-30"
            >
              ▲
            </button>
            <button
              type="button"
              aria-label={t.moveDown}
              disabled={!canMoveDown}
              onClick={() => onMove('down')}
              className="text-ink-400 hover:text-ink-700 flex h-5 w-6 items-center justify-center text-xs leading-none disabled:opacity-30"
            >
              ▼
            </button>
          </div>
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
                : 'text-ink-800 block break-words text-sm'
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
              <MessageIcon />
              <span className="min-w-0 truncate">{task.observation}</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-none items-center gap-2.5 pl-9 sm:pl-0">
        {task.recurringTaskId && (
          <span
            aria-hidden
            title={t.recurring}
            className="text-brand-500 text-sm"
          >
            ↻
          </span>
        )}

        {!task.observation && !editingNote && (
          <button
            type="button"
            aria-label={t.addNote}
            onClick={openNote}
            className={`${iconButtonClass} text-ink-400 hover:text-ink-700`}
          >
            <MessageIcon />
          </button>
        )}

        {options.length > 0 && (
          <div className="relative h-7 w-7 flex-none">
            <span aria-hidden className="pointer-events-none absolute inset-0">
              {assignee ? (
                <Avatar name={assignee.name} size="sm" />
              ) : (
                <span className="border-line text-ink-400 flex h-7 w-7 items-center justify-center rounded-full border border-dashed text-sm">
                  +
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

        <button
          type="button"
          aria-label={t.togglePrivacy}
          aria-pressed={task.isPrivate}
          title={task.isPrivate ? t.private : t.visible}
          onClick={() => onUpdate(task.id, { isPrivate: !task.isPrivate })}
          className={`${iconButtonClass} ${
            task.isPrivate ? 'text-brand-600' : 'text-ink-500'
          }`}
        >
          {task.isPrivate ? '🔒' : '🔓'}
        </button>
      </div>
    </li>
  )
}
