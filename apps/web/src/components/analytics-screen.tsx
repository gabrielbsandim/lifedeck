'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, EmptyState, Skeleton } from '@lifedeck/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useAnalytics } from '@/lib/api/use-analytics'

const RANGES = [7, 30, 90] as const

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-bg flex flex-col gap-1 rounded-2xl border p-4">
      <span className="text-ink-500 text-xs font-medium">{label}</span>
      <span className="text-ink-900 text-3xl font-bold tracking-tight">
        {value}
      </span>
    </div>
  )
}

export function AnalyticsScreen() {
  const { messages } = useI18n()
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const analytics = useAnalytics(days)

  function rangeLabel(value: (typeof RANGES)[number]): string {
    if (value === 7) return messages.analytics.range7
    if (value === 90) return messages.analytics.range90
    return messages.analytics.range30
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/" className="text-brand-600 text-sm font-medium">
          ← {messages.analytics.backToToday}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.analytics.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.analytics.subtitle}</p>
      </header>

      {analytics.isPending ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : analytics.isError ? (
        <Card className="p-8 text-center">
          <p className="text-ink-500 text-sm">{messages.common.error}</p>
        </Card>
      ) : (
        <Card className="flex flex-col gap-6 p-6 sm:p-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard
              label={messages.analytics.completed}
              value={String(analytics.data.totalCompleted)}
            />
            <StatCard
              label={messages.analytics.completionRate}
              value={`${Math.round(analytics.data.completionRate * 100)}%`}
            />
            <StatCard
              label={messages.analytics.streak}
              value={`${analytics.data.currentStreak} ${messages.analytics.streakUnit}`}
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-ink-700 text-sm font-medium">
              {messages.analytics.perDay}
            </span>
            <div className="flex gap-1">
              {RANGES.map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={
                    value === days
                      ? 'bg-brand-600 rounded-lg px-2.5 py-1 text-xs font-medium text-white'
                      : 'border-line text-ink-600 hover:bg-bg rounded-lg border px-2.5 py-1 text-xs font-medium'
                  }
                >
                  {rangeLabel(value)}
                </button>
              ))}
            </div>
          </div>

          <CompletionChart
            days={analytics.data.days}
            empty={messages.analytics.empty}
          />

          <p className="text-ink-400 flex justify-between text-xs">
            <span>{analytics.data.from}</span>
            <span>{analytics.data.to}</span>
          </p>
        </Card>
      )}
    </section>
  )
}

function CompletionChart({
  days,
  empty,
}: {
  days: { date: string; completed: number }[]
  empty: string
}) {
  const total = days.reduce((sum, day) => sum + day.completed, 0)
  if (total === 0) {
    return <EmptyState title={empty} />
  }
  const max = Math.max(1, ...days.map(day => day.completed))

  return (
    <div className="flex h-40 items-end gap-0.5">
      {days.map(day => (
        <div
          key={day.date}
          title={`${day.date}: ${day.completed}`}
          className="bg-brand-500/80 hover:bg-brand-600 flex-1 rounded-t transition"
          style={{
            height: `${(day.completed / max) * 100}%`,
            minHeight: day.completed > 0 ? '4px' : '2px',
          }}
        />
      ))}
    </div>
  )
}
