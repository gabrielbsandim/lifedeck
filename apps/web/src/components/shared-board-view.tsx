'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
  TaskCheckbox,
} from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useSession } from '@/lib/api/use-session'
import { useJoinSharedList, useSharedBoard } from '@/lib/api/use-shared-board'
import { OnboardingCard } from '@/components/onboarding-card'

export function SharedBoardView({ token }: { token: string }) {
  const { messages } = useI18n()
  const router = useRouter()
  const board = useSharedBoard(token)
  const session = useSession()
  const join = useJoinSharedList(token)

  if (board.isPending || session.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }

  if (board.isError) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-ink-500 text-sm">{messages.common.error}</p>
        <Link href="/" className="text-brand-600 text-sm font-medium">
          {messages.app.name}
        </Link>
      </Card>
    )
  }

  const { list, tasks, role } = board.data
  const canEdit = role === 'editor'
  const doneCount = tasks.filter(task => task.status === 'completed').length

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-brand-600 text-sm font-medium">
          {messages.app.name}
        </p>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {list.title}
          </h1>
          <Badge tone="shared">
            {canEdit ? messages.share.editable : messages.share.readOnly}
          </Badge>
        </div>
        <p className="text-ink-500 text-sm">
          {messages.task.progress
            .replace('{done}', String(doneCount))
            .replace('{total}', String(tasks.length))}
        </p>
      </header>

      {canEdit && !session.data && <OnboardingCard />}

      {canEdit && session.data && (
        <Button
          isLoading={join.isPending}
          onClick={() =>
            join.mutate(undefined, {
              onSuccess: () => router.push(`/lists/${list.id}`),
            })
          }
        >
          {messages.share.join}
        </Button>
      )}

      <Card className="p-4 sm:p-8">
        {tasks.length === 0 ? (
          <EmptyState title={messages.task.empty} />
        ) : (
          <ul className="flex flex-col gap-2">
            {tasks.map(task => {
              const completed = task.status === 'completed'
              return (
                <li
                  key={task.id}
                  className="border-line flex items-center gap-3 rounded-xl border bg-white px-3.5 py-3"
                >
                  <TaskCheckbox
                    checked={completed}
                    label={task.title}
                    disabled
                    onChange={() => undefined}
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
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </section>
  )
}
