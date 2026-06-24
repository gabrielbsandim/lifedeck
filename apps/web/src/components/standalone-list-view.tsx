'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { TaskView, UpdateTaskInput } from '@lifedeck/application'
import {
  Badge,
  Button,
  Card,
  Celebration,
  Dialog,
  EmptyState,
  ProgressBar,
  Skeleton,
  TextField,
} from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useMembers } from '@/lib/api/use-share'
import {
  useCreateListTask,
  useDeleteList,
  useDeleteListTask,
  useLeaveList,
  useList,
  useListTasks,
  useRenameList,
  useReorderListTasks,
  useUpdateListTask,
} from '@/lib/api/use-lists'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow, DailyTaskRowOverlay } from '@/components/daily-task-row'
import { TaskDragList } from '@/components/task-drag-list'
import {
  CheckSquareIcon,
  ChevronLeftIcon,
  ShareIcon,
  TrashIcon,
} from '@/components/icons'

export function StandaloneListView({ listId }: { listId: string }) {
  const { messages } = useI18n()
  const router = useRouter()
  const list = useList(listId)
  const tasks = useListTasks(listId)
  const session = useSession()
  const isOwner = Boolean(
    list.data && session.data && list.data.ownerId === session.data.id,
  )
  const members = useMembers(listId, isOwner && listId !== '')
  const createTask = useCreateListTask(listId)
  const updateTask = useUpdateListTask(listId)
  const deleteTask = useDeleteListTask(listId)
  const reorderTasks = useReorderListTasks(listId)
  const renameList = useRenameList(listId)
  const deleteList = useDeleteList()
  const leaveList = useLeaveList()
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  if (list.isPending || tasks.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }
  if (list.isError || tasks.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-ink-500 text-sm">{messages.common.error}</p>
        <Link href="/lists" className="text-brand-600 text-sm font-medium">
          {messages.lists.back}
        </Link>
      </Card>
    )
  }

  // Keep unchecked tasks first and move completed ones to the end, preserving
  // their relative order within each group (Array.prototype.sort is stable).
  const rows = [...tasks.data].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed'),
  )
  const doneCount = rows.filter(task => task.status === 'completed').length
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0
  const allDone = rows.length > 0 && doneCount === rows.length
  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(rows.length))

  function addTask(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createTask.mutate(
      { listId, title: trimmed },
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

  function submitRename(event: FormEvent) {
    event.preventDefault()
    const trimmed = listTitle.trim()
    if (!trimmed) {
      return
    }
    renameList.mutate(
      { title: trimmed },
      { onSuccess: () => setEditingTitle(false) },
    )
  }

  function removeList() {
    deleteList.mutate(listId, { onSuccess: () => router.push('/lists') })
  }

  function removeTask(task: TaskView) {
    deleteTask.mutate(task.id)
  }

  function leaveCurrentList() {
    leaveList.mutate(listId, { onSuccess: () => router.push('/lists') })
  }

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link
          href="/lists"
          className="text-brand-600 hover:text-brand-700 flex w-fit items-center gap-1 text-sm font-medium"
        >
          <ChevronLeftIcon size={16} />
          {messages.lists.back}
        </Link>
        <div className="flex items-center justify-between gap-3">
          {isOwner && editingTitle ? (
            <form onSubmit={submitRename} className="flex flex-1 gap-2">
              <div className="flex-1">
                <TextField
                  value={listTitle}
                  onChange={event => setListTitle(event.target.value)}
                  aria-label={messages.lists.namePlaceholder}
                  maxLength={120}
                  autoFocus
                />
              </div>
              <Button type="submit" isLoading={renameList.isPending}>
                {messages.recurring.save}
              </Button>
            </form>
          ) : isOwner ? (
            <button
              type="button"
              onClick={() => {
                setListTitle(list.data.title)
                setEditingTitle(true)
              }}
              className="hover:text-brand-600 min-w-0 flex-1 truncate text-left text-2xl font-semibold tracking-tight transition"
              title={messages.recurring.edit}
            >
              {list.data.title}
            </button>
          ) : (
            <h1 className="text-ink-800 min-w-0 flex-1 truncate text-2xl font-semibold tracking-tight">
              {list.data.title}
            </h1>
          )}
          {isOwner && !editingTitle && (
            <div className="flex flex-none items-center gap-3">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="bg-brand-600 hover:bg-brand-700 flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-white"
              >
                <ShareIcon size={15} />
                {messages.list.share}
              </button>
              <button
                type="button"
                aria-label={messages.recurring.delete}
                title={messages.recurring.delete}
                onClick={() => setConfirmingDelete(true)}
                className="text-ink-400 hover:text-danger flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          )}
          {!isOwner && (
            <div className="flex flex-none items-center gap-2">
              <Badge tone="shared">{messages.list.shared}</Badge>
              <button
                type="button"
                aria-label={messages.lists.leave}
                title={messages.lists.leave}
                onClick={() => setConfirmingLeave(true)}
                className="text-ink-400 hover:text-danger flex h-9 w-9 items-center justify-center rounded-xl transition-colors"
              >
                <TrashIcon size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {isOwner && (
        <ShareDialog
          listId={listId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      )}

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={messages.lists.deleteTitle}
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-500 text-sm">{messages.lists.deleteBody}</p>
          <div className="flex gap-2">
            <Button
              className="bg-danger h-9 flex-1 text-xs hover:opacity-90"
              isLoading={deleteList.isPending}
              onClick={removeList}
            >
              {messages.recurring.delete}
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setConfirmingDelete(false)}
            >
              {messages.recurring.cancel}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={confirmingLeave}
        onClose={() => setConfirmingLeave(false)}
        title={messages.lists.leaveTitle}
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-500 text-sm">{messages.lists.leaveBody}</p>
          <div className="flex gap-2">
            <Button
              className="bg-danger h-9 flex-1 text-xs hover:opacity-90"
              isLoading={leaveList.isPending}
              onClick={leaveCurrentList}
            >
              {messages.lists.leave}
            </Button>
            <Button
              variant="ghost"
              className="h-9 text-xs"
              onClick={() => setConfirmingLeave(false)}
            >
              {messages.recurring.cancel}
            </Button>
          </div>
        </div>
      </Dialog>

      <Card className="p-4 sm:p-8">
        <div className="border-line bg-bg relative mb-6 rounded-2xl border p-4">
          <Celebration active={allDone} />
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-ink-700 text-sm font-medium">
              {progressLabel}
            </span>
            <span className="text-brand-600 text-xl font-bold">{pct}%</span>
          </div>
          <ProgressBar value={pct} label={progressLabel} />
        </div>

        <form onSubmit={addTask} className="mb-4">
          <TextField
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={messages.task.add}
            aria-label={messages.task.add}
            maxLength={280}
          />
        </form>

        {rows.length === 0 ? (
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
