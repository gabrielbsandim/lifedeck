'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { Button, Card, EmptyState, Skeleton, TextField } from '@taskin/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useCreateList, useUserLists } from '@/lib/api/use-lists'

export function ListsManager() {
  const { messages } = useI18n()
  const lists = useUserLists()
  const createList = useCreateList()
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
        <Link href="/" className="text-brand-600 text-sm font-medium">
          ← {messages.lists.backToToday}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.lists.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.lists.subtitle}</p>
      </header>

      <Card className="p-6 sm:p-8">
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
        ) : standalone.length === 0 ? (
          <EmptyState title={messages.lists.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {standalone.map(list => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="border-line hover:border-brand-600 flex items-center justify-between rounded-xl border bg-white px-4 py-3 transition"
                >
                  <span className="text-ink-800 text-sm font-medium">
                    {list.title}
                  </span>
                  <span className="text-ink-400 text-sm">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  )
}
