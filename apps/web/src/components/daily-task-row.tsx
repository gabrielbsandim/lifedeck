'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react'
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
  ChevronLeftIcon,
  GripIcon,
  LockIcon,
  NoteIcon,
  PlusIcon,
  RecurringIcon,
  TrashIcon,
  UnlockIcon,
} from '@/components/icons'

const iconButtonClass =
  'flex h-8 w-8 flex-none items-center justify-center rounded-lg transition-colors'

const gripClass =
  'text-ink-300 hover:text-ink-500 flex h-7 w-4 flex-none items-center justify-center sm:w-5'

type AssigneeOption = { id: string; name: string }

type SharedProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onDelete?: (task: TaskView) => void
}

type TaskRowBodyProps = SharedProps & {
  grip?: ReactNode
  containerRef?: Ref<HTMLLIElement>
  style?: CSSProperties
  dragging?: boolean
  overlay?: boolean
}

function TaskRowBody({
  task,
  members,
  self,
  onToggle,
  onUpdate,
  onDelete,
  grip,
  containerRef,
  style,
  dragging = false,
  overlay = false,
}: TaskRowBodyProps) {
  const { messages, locale } = useI18n()
  const t = messages.task
  const completed = task.status === 'completed'
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(task.observation ?? '')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [actionsOpen, setActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)

  // While the action drawer is open, a tap anywhere outside it slides it back.
  useEffect(() => {
    if (!actionsOpen) {
      return
    }
    function onOutside(event: PointerEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false)
      }
    }
    document.addEventListener('pointerdown', onOutside)
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [actionsOpen])

  function openTitle() {
    setActionsOpen(false)
    setTitleDraft(task.title)
    setEditingTitle(true)
  }

  function saveTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    }
    setEditingTitle(false)
  }

  const options: AssigneeOption[] = [
    ...(self ? [{ id: self.id, name: self.name }] : []),
    ...members
      .filter(member => member.userId !== self?.id)
      .map(member => ({ id: member.userId, name: member.displayName })),
  ]
  const assignee = options.find(option => option.id === task.assigneeId) ?? null

  function openNote() {
    setActionsOpen(false)
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
      ref={containerRef}
      style={style}
      className={`border-line relative flex items-center gap-1.5 overflow-clip rounded-2xl border bg-white py-2.5 pl-1.5 pr-1.5 transition-shadow sm:gap-3 sm:pl-2 sm:pr-2.5 ${
        overlay
          ? 'ring-brand-200/70 cursor-grabbing shadow-[0_16px_36px_-12px_rgba(70,50,120,0.45)] ring-1'
          : 'shadow-[0_1px_2px_rgba(70,60,90,0.05)]'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      {grip}

      <div className="pt-0.5">
        <TaskCheckbox
          checked={completed}
          label={task.title}
          onChange={() => onToggle(task)}
        />
      </div>

      <div className="min-w-0 flex-1">
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={event => setTitleDraft(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === 'Tab') {
                event.preventDefault()
                saveTitle()
              }
              if (event.key === 'Escape') {
                setTitleDraft(task.title)
                setEditingTitle(false)
              }
            }}
            aria-label={t.editTitle}
            maxLength={280}
            className="border-line text-ink-800 focus-visible:border-brand-600 w-full rounded-md border bg-white px-2 py-1 text-base font-medium outline-none sm:text-sm"
          />
        ) : (
          <button
            type="button"
            onClick={openTitle}
            aria-label={t.editTitle}
            className={`block w-full break-words text-left text-sm ${
              completed
                ? 'text-ink-500 line-through'
                : 'text-ink-800 font-medium'
            }`}
          >
            {task.title}
          </button>
        )}
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
              if (event.key === 'Enter' || event.key === 'Tab') {
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
            className="border-line text-ink-700 focus-visible:border-brand-600 mt-1 w-full rounded-md border bg-white px-2 py-1 text-base outline-none sm:text-xs"
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

      <div
        ref={actionsRef}
        className="relative flex flex-none items-center self-stretch"
      >
        {task.recurringTaskId && (
          <span
            aria-hidden
            title={t.recurring}
            className="text-brand-400 flex h-8 w-6 items-center justify-center"
          >
            <RecurringIcon size={14} />
          </span>
        )}

        {/* Action drawer: slides in from the right, over the description. */}
        <div
          className={`absolute inset-y-0 right-8 flex items-center gap-0.5 bg-white pl-3 transition-all duration-200 ease-out ${
            actionsOpen
              ? 'translate-x-0 opacity-100 shadow-[-12px_0_14px_-10px_rgba(70,60,90,0.18)]'
              : 'pointer-events-none translate-x-full opacity-0'
          }`}
        >
          <button
            type="button"
            aria-label={task.observation ? t.editNote : t.addNote}
            onClick={openNote}
            className={`${iconButtonClass} text-ink-400 hover:text-ink-700 hover:bg-bg`}
          >
            <NoteIcon size={16} />
          </button>

          <button
            type="button"
            aria-label={t.togglePrivacy}
            aria-pressed={task.isPrivate}
            title={task.isPrivate ? t.private : t.visible}
            onClick={() => onUpdate(task.id, { isPrivate: !task.isPrivate })}
            className={`${iconButtonClass} hover:bg-bg ${
              task.isPrivate
                ? 'text-brand-600'
                : 'text-ink-400 hover:text-ink-700'
            }`}
          >
            {task.isPrivate ? <LockIcon size={16} /> : <UnlockIcon size={16} />}
          </button>

          {options.length > 0 && (
            <div className="relative h-8 w-8 flex-none">
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
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

          {onDelete && (
            <button
              type="button"
              aria-label={t.delete}
              title={t.delete}
              onClick={() => onDelete(task)}
              className={`${iconButtonClass} text-ink-400 hover:text-danger hover:bg-bg`}
            >
              <TrashIcon size={16} />
            </button>
          )}
        </div>

        {/* The only control visible when the drawer is closed. */}
        <button
          type="button"
          aria-label={t.actions}
          aria-expanded={actionsOpen}
          onClick={() => setActionsOpen(open => !open)}
          className={`${iconButtonClass} text-ink-400 hover:text-ink-700 hover:bg-bg relative z-10`}
        >
          <ChevronLeftIcon
            size={18}
            className={`transition-transform duration-200 ${
              actionsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>
    </li>
  )
}

/** In-list row wired to dnd-kit; only the grip handle starts a drag. */
export function DailyTaskRow(props: SharedProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task.id })
  const { messages } = useI18n()

  const grip = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      aria-label={messages.task.reorder}
      className={`${gripClass} cursor-grab touch-none active:cursor-grabbing`}
      {...attributes}
      {...listeners}
    >
      <GripIcon />
    </button>
  )

  return (
    <TaskRowBody
      {...props}
      grip={grip}
      containerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
    />
  )
}

/** Lifted copy rendered inside the DragOverlay while a row is being dragged. */
export function DailyTaskRowOverlay(props: SharedProps) {
  const grip = (
    <span aria-hidden className={`${gripClass} cursor-grabbing`}>
      <GripIcon />
    </span>
  )
  return <TaskRowBody {...props} grip={grip} overlay />
}
