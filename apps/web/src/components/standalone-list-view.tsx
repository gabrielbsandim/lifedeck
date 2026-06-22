'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { TaskView, UpdateTaskInput } from '@taskin/application'
import {
  Button,
  Card,
  EmptyState,
  ProgressBar,
  Skeleton,
  TextField,
} from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useMembers } from '@/lib/api/use-share'
import {
  useCreateListTask,
  useDeleteList,
  useList,
  useListTasks,
  useRenameList,
  useReorderListTasks,
  useUpdateListTask,
} from '@/lib/api/use-lists'
import { moveInOrder } from '@/lib/api/reorder'
import { ShareDialog } from '@/components/share-dialog'
import { DailyTaskRow } from '@/components/daily-task-row'

export function StandaloneListView({ listId }: { listId: string }) {
  const { messages } = useI18n()
  const router = useRouter()
  const list = useList(listId)
  const tasks = useListTasks(listId)
  const session = useSession()
  const members = useMembers(listId, listId !== '')
  const createTask = useCreateListTask(listId)
  const updateTask = useUpdateListTask(listId)
  const reorderTasks = useReorderListTasks(listId)
  const renameList = useRenameList(listId)
  const deleteList = useDeleteList()
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState('')

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

  const rows = tasks.data
  const doneCount = rows.filter(task => task.status === 'completed').length
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0
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

  function move(index: number, direction: 'up' | 'down') {
    const ids = rows.map(task => task.id)
    const next = moveInOrder(ids, index, direction)
    if (next !== ids) {
      reorderTasks.mutate(next)
    }
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

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/lists" className="text-brand-600 text-sm font-medium">
          ← {messages.lists.back}
        </Link>
        <div className="flex items-center justify-between gap-3">
          {editingTitle ? (
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
          ) : (
            <button
              type="button"
              onClick={() => {
                setListTitle(list.data.title)
                setEditingTitle(true)
              }}
              className="hover:text-brand-600 text-left text-2xl font-semibold tracking-tight transition"
              title={messages.recurring.edit}
            >
              {list.data.title}
            </button>
          )}
          {!editingTitle && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="text-brand-600 hover:text-brand-700 text-sm font-medium"
              >
                {messages.list.share}
              </button>
              <button
                type="button"
                onClick={removeList}
                className="text-danger text-sm font-medium"
              >
                {messages.recurring.delete}
              </button>
            </div>
          )}
        </div>
      </header>

      <ShareDialog
        listId={listId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <Card className="p-6 sm:p-8">
        <div className="border-line bg-bg mb-6 rounded-2xl border p-4">
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
          <EmptyState title={messages.task.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((task, index) => (
              <DailyTaskRow
                key={task.id}
                task={task}
                members={members.data ?? []}
                self={self}
                onToggle={toggle}
                onUpdate={update}
                onMove={direction => move(index, direction)}
                canMoveUp={index > 0}
                canMoveDown={index < rows.length - 1}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
