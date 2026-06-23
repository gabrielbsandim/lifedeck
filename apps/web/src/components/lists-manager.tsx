'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button, Card, EmptyState, Skeleton, TextField } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useCreateList, useDeleteList, useUserLists } from '@/lib/api/use-lists'
import { ChevronRightIcon, CloseIcon } from '@/components/icons'

export function ListsManager() {
  const { messages } = useI18n()
  const lists = useUserLists()
  const createList = useCreateList()
  const deleteList = useDeleteList()
  const [title, setTitle] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createList.mutate(
      { title: trimmed, type: 'standalone' },
      { onSuccess: () => setTitle('') },
    )
  }

  const standalone = (lists.data ?? []).filter(
    list => list.type === 'standalone',
  )

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.lists.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.lists.subtitle}</p>
      </header>

      <Card className="p-4 sm:p-8">
        <form onSubmit={submit} className="mb-6 flex gap-2">
          <div className="flex-1">
            <TextField
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder={messages.lists.namePlaceholder}
              aria-label={messages.lists.namePlaceholder}
              maxLength={120}
            />
          </div>
          <Button
            type="submit"
            isLoading={createList.isPending}
            disabled={!title.trim()}
          >
            {messages.lists.create}
          </Button>
        </form>

        {lists.isPending ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : lists.isError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-ink-500 text-sm">{messages.common.error}</p>
            <Button variant="ghost" onClick={() => lists.refetch()}>
              {messages.common.retry}
            </Button>
          </div>
        ) : standalone.length === 0 ? (
          <EmptyState title={messages.lists.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {standalone.map(list => (
              <li
                key={list.id}
                className="border-line hover:border-brand-300 group flex items-center rounded-2xl border bg-white shadow-[0_1px_2px_rgba(70,60,90,0.05)] transition"
              >
                <Link
                  href={`/lists/${list.id}`}
                  className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5"
                >
                  <span className="text-ink-800 truncate text-sm font-medium">
                    {list.title}
                  </span>
                  <ChevronRightIcon
                    size={18}
                    className="text-ink-300 group-hover:text-brand-500 flex-none transition-colors"
                  />
                </Link>
                <button
                  type="button"
                  aria-label={`${messages.recurring.delete} ${list.title}`}
                  onClick={() => deleteList.mutate(list.id)}
                  className="text-ink-300 hover:text-danger flex h-9 w-10 flex-none items-center justify-center transition-colors"
                >
                  <CloseIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
