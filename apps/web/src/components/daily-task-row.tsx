'use client'

import type { MemberView, TaskView, UpdateTaskInput } from '@taskin/application'
import { TaskCheckbox } from '@taskin/ui'

const selectClass =
  'border-line text-ink-600 rounded-lg border bg-white px-2 py-1 text-xs outline-none'

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
  const completed = task.status === 'completed'

  const options: AssigneeOption[] = [
    ...(self ? [{ id: self.id, name: self.name }] : []),
    ...members
      .filter(member => member.userId !== self?.id)
      .map(member => ({ id: member.userId, name: member.displayName })),
  ]

  return (
    <li className="border-line flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3">
      {onMove && (
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={!canMoveUp}
            onClick={() => onMove('up')}
            className="text-ink-400 hover:text-ink-700 text-xs leading-none disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={!canMoveDown}
            onClick={() => onMove('down')}
            className="text-ink-400 hover:text-ink-700 text-xs leading-none disabled:opacity-30"
          >
            ▼
          </button>
        </div>
      )}
      <TaskCheckbox
        checked={completed}
        label={task.title}
        onChange={() => onToggle(task)}
      />
      <span
        className={
          completed
            ? 'text-ink-500 flex-1 text-sm line-through'
            : 'text-ink-800 flex-1 text-sm'
        }
      >
        {task.title}
      </span>

      {task.recurringTaskId && (
        <span aria-hidden title="Recurring" className="text-brand-500 text-sm">
          ↻
        </span>
      )}

      {options.length > 0 && (
        <select
          aria-label="Assignee"
          value={task.assigneeId ?? ''}
          onChange={event =>
            onUpdate(task.id, {
              assigneeId: event.target.value === '' ? null : event.target.value,
            })
          }
          className={selectClass}
        >
          <option value="">—</option>
          {options.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        aria-label="Toggle privacy"
        aria-pressed={task.isPrivate}
        title={task.isPrivate ? 'Private' : 'Visible to collaborators'}
        onClick={() => onUpdate(task.id, { isPrivate: !task.isPrivate })}
        className={task.isPrivate ? 'text-brand-600' : 'text-ink-500'}
      >
        {task.isPrivate ? '🔒' : '🔓'}
      </button>
    </li>
  )
}
