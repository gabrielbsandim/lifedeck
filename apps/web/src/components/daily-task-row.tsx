'use client'

import { useState, type CSSProperties, type Ref } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  MemberView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import { TaskCheckbox, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { TaskSheet } from '@/components/task-sheet'
import {
  CheckSquareIcon,
  ChevronRightIcon,
  LockIcon,
  NoteIcon,
  RecurringIcon,
} from '@/components/icons'

type SharedProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  boardKey: QueryKey
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onDelete?: (task: TaskView) => void
}

type TaskRowBodyProps = SharedProps & {
  dragHandle?: Record<string, unknown>
  containerRef?: Ref<HTMLLIElement>
  style?: CSSProperties
  dragging?: boolean
  overlay?: boolean
}

function TaskRowBody({
  task,
  members,
  self,
  boardKey,
  onToggle,
  onUpdate,
  onDelete,
  dragHandle,
  containerRef,
  style,
  dragging = false,
  overlay = false,
}: TaskRowBodyProps) {
  const { messages } = useI18n()
  const t = messages.task
  const completed = task.status === 'completed'
  const [sheetOpen, setSheetOpen] = useState(false)

  const subtaskTotal = task.subtasks.total
  const subtaskDone = task.subtasks.completed
  const subtaskPct = subtaskTotal
    ? Math.round((subtaskDone / subtaskTotal) * 100)
    : 0

  return (
    <li
      ref={containerRef}
      style={style}
      {...dragHandle}
      className={cn(
        'relative flex touch-none items-start gap-3 bg-white py-2 pl-4 pr-1.5',
        overlay
          ? 'ring-brand-200/70 rounded-2xl shadow-[0_16px_36px_-12px_rgba(70,50,120,0.45)] ring-1'
          : 'min-h-[56px]',
        dragging && 'opacity-40',
      )}
    >
      <div className="mt-2">
        <TaskCheckbox
          checked={completed}
          label={task.title}
          onChange={() => onToggle(task)}
        />
      </div>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-label={t.edit}
        className="flex min-w-0 flex-1 flex-col gap-[3px] pt-[7px] text-left"
      >
        <span
          className={cn(
            'text-[15px] leading-[1.35]',
            completed ? 'text-ink-500 line-through' : 'text-ink-800',
          )}
        >
          {task.title}
        </span>
        {task.observation && (
          <span className="text-ink-500 flex max-w-full items-center gap-1.5 text-[12.5px]">
            <NoteIcon size={11} strokeWidth={2.5} className="flex-none" />
            <span className="min-w-0 truncate">{task.observation}</span>
          </span>
        )}
        {subtaskTotal > 0 && (
          <span className="text-ink-400 flex items-center gap-1.5 text-xs font-semibold">
            <CheckSquareIcon
              size={11}
              strokeWidth={2.5}
              className="flex-none"
            />
            {messages.subtask.progress
              .replace('{done}', String(subtaskDone))
              .replace('{total}', String(subtaskTotal))}
            <span className="bg-ink-500/15 inline-block h-1 w-10 overflow-hidden rounded-full">
              <span
                className="bg-brand-600 block h-full rounded-full"
                style={{ width: `${subtaskPct}%` }}
              />
            </span>
          </span>
        )}
      </button>

      <span className="flex flex-none items-center pt-2">
        {task.isPrivate && (
          <span className="text-brand-500 flex px-0.5" title={t.private}>
            <LockIcon size={13} strokeWidth={2.2} />
          </span>
        )}
        {task.recurringTaskId && (
          <span className="text-brand-300 flex px-0.5" title={t.recurring}>
            <RecurringIcon size={13} strokeWidth={2.2} />
          </span>
        )}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label={t.edit}
          className="text-ink-300 flex h-[34px] w-[34px] items-center justify-center"
        >
          <ChevronRightIcon size={16} />
        </button>
      </span>

      {!overlay && (
        <span
          aria-hidden
          className="bg-line absolute bottom-0 left-[53px] right-0 h-px"
        />
      )}

      {!overlay && (
        <TaskSheet
          task={task}
          members={members}
          self={self}
          boardKey={boardKey}
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </li>
  )
}

/**
 * In-list row wired to dnd-kit. The whole row is the drag handle with a short
 * press delay, so a tap opens the detail sheet and a press-and-hold reorders
 * (matching the prototype, which shows no separate grip).
 */
export function DailyTaskRow(props: SharedProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id })

  return (
    <TaskRowBody
      {...props}
      dragHandle={{ ...attributes, ...listeners }}
      containerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  )
}

/** Lifted copy rendered inside the DragOverlay while a row is being dragged. */
export function DailyTaskRowOverlay(props: SharedProps) {
  return <TaskRowBody {...props} overlay />
}
