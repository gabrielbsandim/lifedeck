'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Avatar, Badge, Button, Card, Skeleton, TextField } from '@lifedeck/ui'
import type { ListView, TaskView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import {
  useCreateList,
  useListSummary,
  useUserLists,
} from '@/lib/api/use-lists'
import { useDailyBoard } from '@/lib/api/use-daily-board'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { todayIso } from '@/lib/api/dates'
import { PlusIcon } from '@/components/icons'

const DOT_COLORS = [
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-brand-500',
  'bg-rose-500',
  'bg-sky-500',
]

function progressOf(tasks: TaskView[]) {
  const total = tasks.length
  const done = tasks.filter(task => task.status === 'completed').length
  const pct = total ? Math.round((done / total) * 100) : 0
  return { total, done, pct }
}

function TodayCard() {
  const { messages } = useI18n()
  const board = useDailyBoard(todayIso())
  const session = useSession()
  const listId = board.data?.list.id ?? ''
  const members = useMembers(listId, listId !== '')

  const tasks = board.data?.tasks ?? []
  const { done, total, pct } = progressOf(tasks)
  const meta = messages.task.progress
    .replace('{done}', String(done))
    .replace('{total}', String(total))

  const people = [
    ...(session.data
      ? [
          {
            id: session.data.id,
            name: session.data.displayName,
            avatarUrl: session.data.avatarUrl,
          },
        ]
      : []),
    ...(members.data ?? [])
      .filter(member => member.userId !== session.data?.id)
      .map(member => ({
        id: member.userId,
        name: member.displayName,
        avatarUrl: null,
      })),
  ].slice(0, 3)

  return (
    <Link
      href="/"
      className="from-brand-600 relative block overflow-hidden rounded-2xl bg-gradient-to-br to-violet-500 p-5 text-white shadow-[0_14px_30px_-12px_rgba(109,74,230,0.55)] transition-transform active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
          {messages.nav.today}
        </span>
        {people.length > 0 && (
          <div className="flex -space-x-2">
            {people.map(person => (
              <Avatar
                key={person.id}
                name={person.name}
                src={person.avatarUrl}
                size="sm"
                className="ring-2 ring-white/40"
              />
            ))}
          </div>
        )}
      </div>
      <div className="text-lg font-bold">{messages.list.daily}</div>
      <div className="mb-3 text-sm text-white/80">
        {board.isPending ? ' ' : meta}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/25">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </Link>
  )
}

function ListSummaryCard({ list, index }: { list: ListView; index: number }) {
  const { messages } = useI18n()
  const summary = useListSummary(list.id)
  const { done, total, pct } = progressOf(summary.data ?? [])
  const shared = list.visibility === 'link'
  const dot = DOT_COLORS[index % DOT_COLORS.length]

  return (
    <Link
      href={`/lists/${list.id}`}
      className="border-line hover:border-brand-300 block rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(70,60,90,0.05)] transition active:scale-[0.99]"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`h-2.5 w-2.5 flex-none rounded-full ${dot}`} />
          <span className="text-ink-800 truncate text-base font-semibold">
            {list.title}
          </span>
        </div>
        <Badge tone={shared ? 'shared' : 'neutral'}>
          {shared ? messages.lists.sharedBadge : messages.lists.you}
        </Badge>
      </div>
      <div className="flex items-center gap-3">
        <div className="bg-bg h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              pct === 100 ? 'bg-emerald-500' : 'bg-brand-600'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {summary.isPending ? (
          <Skeleton className="h-3 w-16 rounded-full" />
        ) : (
          <span className="text-ink-500 flex-none text-xs font-semibold tabular-nums">
            {total > 0 ? `${done}/${total} · ${pct}%` : `${pct}%`}
          </span>
        )}
      </div>
    </Link>
  )
}

export function ListsManager() {
  const { messages } = useI18n()
  const lists = useUserLists()
  const createList = useCreateList()
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createList.mutate(
      { title: trimmed, type: 'standalone' },
      {
        onSuccess: () => {
          setTitle('')
          setCreating(false)
        },
      },
    )
  }

  const standalone = lists.data?.pages.flatMap(page => page.items) ?? []

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.lists.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.lists.subtitle}</p>
      </header>

      <TodayCard />

      {lists.isPending ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : lists.isError ? (
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="text-ink-500 text-sm">{messages.common.error}</p>
          <Button variant="ghost" onClick={() => lists.refetch()}>
            {messages.common.retry}
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {standalone.map((list, index) => (
            <ListSummaryCard key={list.id} list={list} index={index} />
          ))}

          {lists.hasNextPage && (
            <Button
              variant="ghost"
              isLoading={lists.isFetchingNextPage}
              onClick={() => lists.fetchNextPage()}
            >
              {messages.common.loadMore}
            </Button>
          )}

          {creating ? (
            <form
              onSubmit={submit}
              className="border-line flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(70,60,90,0.05)]"
            >
              <TextField
                autoFocus
                value={title}
                onChange={event => setTitle(event.target.value)}
                placeholder={messages.lists.namePlaceholder}
                aria-label={messages.lists.namePlaceholder}
                maxLength={120}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  isLoading={createList.isPending}
                  disabled={!title.trim()}
                >
                  {messages.lists.create}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false)
                    setTitle('')
                  }}
                >
                  {messages.recurring.cancel}
                </Button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="border-brand-300 bg-brand-50/50 text-brand-600 hover:bg-brand-50 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed text-sm font-semibold transition-colors"
            >
              <PlusIcon size={18} />
              {messages.lists.newList}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
