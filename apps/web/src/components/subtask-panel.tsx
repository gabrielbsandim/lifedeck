'use client'

import { useState, type FormEvent } from 'react'
import type { QueryKey } from '@tanstack/react-query'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SubtaskView } from '@lifedeck/application'
import { Dialog, EmptyState, cn } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateSubtask,
  useDeleteSubtask,
  useReorderSubtasks,
  useSubtasks,
  useUpdateSubtask,
} from '@/lib/api/use-subtasks'
import { TaskDragList } from '@/components/task-drag-list'
import {
  CheckSquareIcon,
  GripIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@/components/icons'

function SubtaskCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean
  label: string
  onChange: () => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        'flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 transition-colors duration-150',
        checked
          ? 'border-brand-600 bg-brand-600'
          : 'border-ink-500/40 bg-white',
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={cn(
          'h-3 w-3 text-white',
          checked ? 'opacity-100' : 'opacity-0',
        )}
      >
        <path
          d="M5 13l4 4L19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function SubtaskAddForm({
  taskId,
  boardKey,
  autoFocus = false,
}: {
  taskId: string
  boardKey: QueryKey
  autoFocus?: boolean
}) {
  const { messages } = useI18n()
  const createSubtask = useCreateSubtask(taskId, boardKey)
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
    <form onSubmit={add} className="flex items-center gap-2">
      <span className="text-ink-300 flex h-5 w-5 flex-none items-center justify-center">
        <PlusIcon size={14} />
      </span>
      <input
        autoFocus={autoFocus}
        value={draft}
        onChange={event => setDraft(event.target.value)}
        placeholder={messages.subtask.add}
        aria-label={messages.subtask.add}
        maxLength={280}
        className="border-line text-ink-700 focus-visible:border-brand-600 min-w-0 flex-1 rounded-md border bg-white px-2 py-1 text-base outline-none sm:text-sm"
      />
    </form>
  )
}

export function SubtaskInline({
  taskId,
  boardKey,
  onManage,
}: {
  taskId: string
  boardKey: QueryKey
  onManage: () => void
}) {
  const { messages } = useI18n()
  const query = useSubtasks(taskId, true)
  const updateSubtask = useUpdateSubtask(taskId, boardKey)
  const subtasks = query.data ?? []

  return (
    <div className="border-line mt-2 flex flex-col gap-2 border-t pl-8 pr-2 pt-2.5">
      {subtasks.map(subtask => {
        const completed = subtask.status === 'completed'
        return (
          <div key={subtask.id} className="flex items-center gap-2.5">
            <SubtaskCheckbox
              checked={completed}
              label={subtask.title}
              onChange={() =>
                updateSubtask.mutate({
                  id: subtask.id,
                  input: { status: completed ? 'pending' : 'completed' },
                })
              }
            />
            <span
              className={cn(
                'min-w-0 flex-1 break-words text-sm',
                completed ? 'text-ink-400 line-through' : 'text-ink-700',
              )}
            >
              {subtask.title}
            </span>
          </div>
        )
      })}

      <SubtaskAddForm taskId={taskId} boardKey={boardKey} />

      <button
        type="button"
        onClick={onManage}
        className="text-ink-400 hover:text-ink-700 mt-0.5 flex items-center gap-1.5 self-start text-xs font-medium transition-colors"
      >
        <PencilIcon size={12} />
        {messages.subtask.manage}
      </button>
    </div>
  )
}

function ManageRow({
  subtask,
  taskId,
  boardKey,
  grip,
  containerRef,
  style,
  dragging = false,
  overlay = false,
}: {
  subtask: SubtaskView
  taskId: string
  boardKey: QueryKey
  grip?: React.ReactNode
  containerRef?: React.Ref<HTMLLIElement>
  style?: React.CSSProperties
  dragging?: boolean
  overlay?: boolean
}) {
  const { messages } = useI18n()
  const updateSubtask = useUpdateSubtask(taskId, boardKey)
  const deleteSubtask = useDeleteSubtask(taskId, boardKey)
  const completed = subtask.status === 'completed'
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(subtask.title)

  function save() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== subtask.title) {
      updateSubtask.mutate({ id: subtask.id, input: { title: trimmed } })
    }
    setEditing(false)
  }

  return (
    <li
      ref={containerRef}
      style={style}
      className={cn(
        'border-line flex items-center gap-2 rounded-xl border bg-white py-2 pl-1 pr-2',
        overlay
          ? 'shadow-[0_12px_28px_-12px_rgba(70,50,120,0.45)]'
          : 'shadow-[0_1px_2px_rgba(70,60,90,0.05)]',
        dragging && 'opacity-40',
      )}
    >
      {grip}
      <SubtaskCheckbox
        checked={completed}
        label={subtask.title}
        onChange={() =>
          updateSubtask.mutate({
            id: subtask.id,
            input: { status: completed ? 'pending' : 'completed' },
          })
        }
      />
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              save()
            }
            if (event.key === 'Escape') {
              setDraft(subtask.title)
              setEditing(false)
            }
          }}
          aria-label={messages.subtask.rename}
          maxLength={280}
          className="border-line text-ink-800 focus-visible:border-brand-600 min-w-0 flex-1 rounded-md border bg-white px-2 py-1 text-base outline-none sm:text-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(subtask.title)
            setEditing(true)
          }}
          aria-label={messages.subtask.rename}
          className={cn(
            'min-w-0 flex-1 break-words text-left text-sm',
            completed ? 'text-ink-400 line-through' : 'text-ink-700',
          )}
        >
          {subtask.title}
        </button>
      )}
      <button
        type="button"
        aria-label={messages.subtask.delete}
        title={messages.subtask.delete}
        onClick={() => deleteSubtask.mutate(subtask.id)}
        className="text-ink-400 hover:text-danger hover:bg-bg flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </li>
  )
}

export function SubtaskDialog({
  taskId,
  taskTitle,
  boardKey,
  open,
  onClose,
}: {
  taskId: string
  taskTitle: string
  boardKey: QueryKey
  open: boolean
  onClose: () => void
}) {
  const { messages } = useI18n()
  const query = useSubtasks(taskId, open)
  const reorderSubtasks = useReorderSubtasks(taskId, boardKey)
  const subtasks = query.data ?? []

  return (
    <Dialog open={open} onClose={onClose} title={taskTitle}>
      <div className="flex flex-col gap-3">
        <p className="text-ink-400 text-xs font-semibold uppercase tracking-wide">
          {messages.subtask.title}
        </p>

        {subtasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquareIcon size={20} />}
            title={messages.subtask.title}
            description={messages.subtask.empty}
          />
        ) : (
          <TaskDragList
            items={subtasks}
            getId={subtask => subtask.id}
            onReorder={ids => reorderSubtasks.mutate(ids)}
            className="flex flex-col gap-2"
            renderItem={(subtask, { overlay }) =>
              overlay ? (
                <ManageRow
                  subtask={subtask}
                  taskId={taskId}
                  boardKey={boardKey}
                  grip={
                    <span
                      aria-hidden
                      className="text-ink-300 flex h-7 w-5 flex-none items-center justify-center"
                    >
                      <GripIcon />
                    </span>
                  }
                  overlay
                />
              ) : (
                <ManageDragRow
                  key={subtask.id}
                  subtask={subtask}
                  taskId={taskId}
                  boardKey={boardKey}
                />
              )
            }
          />
        )}

        <SubtaskAddForm taskId={taskId} boardKey={boardKey} autoFocus />
      </div>
    </Dialog>
  )
}

function ManageDragRow({
  subtask,
  taskId,
  boardKey,
}: {
  subtask: SubtaskView
  taskId: string
  boardKey: QueryKey
}) {
  const { messages } = useI18n()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id })

  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={messages.subtask.reorder}
      className="text-ink-300 hover:text-ink-500 flex h-7 w-5 flex-none cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <GripIcon />
    </button>
  )

  return (
    <ManageRow
      subtask={subtask}
      taskId={taskId}
      boardKey={boardKey}
      grip={grip}
      containerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  )
}
