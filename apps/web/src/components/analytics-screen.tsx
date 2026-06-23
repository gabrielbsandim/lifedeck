'use client'

import { useState } from 'react'
import { Card, Skeleton } from '@lifedeck/ui'
import type { AnalyticsView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useAnalytics } from '@/lib/api/use-analytics'

type RangeKey = 'daily' | 'weekly' | 'monthly'
type Bucket = { label: string; value: number }

const RANGES: Record<
  RangeKey,
  { days: number; bucket: 'day' | 'week' | 'month' }
> = {
  daily: { days: 7, bucket: 'day' },
  weekly: { days: 56, bucket: 'week' },
  monthly: { days: 180, bucket: 'month' },
}

const TABS: RangeKey[] = ['daily', 'weekly', 'monthly']

function dayFrom(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function bucketize(
  days: AnalyticsView['days'],
  bucket: 'day' | 'week' | 'month',
  locale: string,
): Bucket[] {
  if (bucket === 'day') {
    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: 'narrow',
      timeZone: 'UTC',
    })
    return days.map(day => ({
      label: weekday.format(dayFrom(day.date)),
      value: day.completed,
    }))
  }

  if (bucket === 'week') {
    const out: Bucket[] = []
    const dm = new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'numeric',
      timeZone: 'UTC',
    })
    for (let i = 0; i < days.length; i += 7) {
      const chunk = days.slice(i, i + 7)
      if (chunk.length === 0) continue
      out.push({
        label: dm.format(dayFrom(chunk[0]!.date)),
        value: chunk.reduce((sum, day) => sum + day.completed, 0),
      })
    }
    return out
  }

  const month = new Intl.DateTimeFormat(locale, {
    month: 'short',
    timeZone: 'UTC',
  })
  const byMonth = new Map<string, number>()
  for (const day of days) {
    const key = day.date.slice(0, 7)
    byMonth.set(key, (byMonth.get(key) ?? 0) + day.completed)
  }
  return Array.from(byMonth.entries()).map(([key, value]) => ({
    label: month.format(new Date(`${key}-01T00:00:00.000Z`)),
    value,
  }))
}

function trendPct(days: AnalyticsView['days']): number | null {
  if (days.length < 4) return null
  const mid = Math.floor(days.length / 2)
  const first = days.slice(0, mid).reduce((sum, d) => sum + d.completed, 0)
  const second = days.slice(mid).reduce((sum, d) => sum + d.completed, 0)
  if (first === 0) return null
  return Math.round(((second - first) / first) * 100)
}

function CompletionChart({
  buckets,
  empty,
}: {
  buckets: Bucket[]
  empty: string
}) {
  const total = buckets.reduce((sum, b) => sum + b.value, 0)
  if (total === 0) {
    return (
      <div className="text-ink-400 flex h-40 items-center justify-center text-sm">
        {empty}
      </div>
    )
  }
  const max = Math.max(1, ...buckets.map(b => b.value))

  return (
    <div className="flex h-40 items-end justify-between gap-1.5">
      {buckets.map((bucket, index) => {
        const last = index === buckets.length - 1
        const pct = Math.round((bucket.value / max) * 100)
        return (
          <div
            key={`${bucket.label}-${index}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              title={`${bucket.label}: ${bucket.value}`}
              className={`w-full max-w-[34px] rounded-t-lg transition-[height] duration-500 ${
                last
                  ? 'to-brand-600 bg-gradient-to-b from-violet-500'
                  : 'bg-brand-200'
              }`}
              style={{
                height: `${Math.max(pct, bucket.value > 0 ? 6 : 2)}%`,
              }}
            />
            <span className="text-ink-400 truncate text-[10px]">
              {bucket.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <span
        className={`text-3xl font-extrabold tracking-tight ${
          accent ? 'text-violet-500' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
      <span className="text-ink-500 text-xs">{label}</span>
    </Card>
  )
}

export function AnalyticsScreen() {
  const { messages, locale } = useI18n()
  const [range, setRange] = useState<RangeKey>('weekly')
  const { days } = RANGES[range]
  const analytics = useAnalytics(days)

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.analytics.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.analytics.subtitle}</p>
      </header>

      <div className="bg-bg flex gap-1 rounded-xl p-1">
        {TABS.map(tab => {
          const active = tab === range
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setRange(tab)}
              aria-pressed={active}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                active
                  ? 'text-brand-700 bg-white shadow-sm'
                  : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {messages.analytics[tab]}
            </button>
          )
        })}
      </div>

      {analytics.isPending ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : analytics.isError ? (
        <Card className="p-8 text-center">
          <p className="text-ink-500 text-sm">{messages.common.error}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-ink-500 text-sm">
                {messages.analytics.completionRate}
              </span>
              <div className="flex items-end gap-3">
                <span className="text-brand-600 text-5xl font-extrabold leading-none tracking-tight">
                  {Math.round(analytics.data.completionRate * 100)}%
                </span>
                {(() => {
                  const delta = trendPct(analytics.data.days)
                  if (delta === null) return null
                  const up = delta >= 0
                  return (
                    <span
                      className={`pb-1 text-sm font-semibold ${
                        up ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {up ? '+' : ''}
                      {delta}%
                    </span>
                  )
                })()}
              </div>
            </div>
            <CompletionChart
              buckets={bucketize(
                analytics.data.days,
                RANGES[range].bucket,
                locale,
              )}
              empty={messages.analytics.empty}
            />
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={messages.analytics.dayStreak}
              value={String(analytics.data.currentStreak)}
              accent
            />
            <StatCard
              label={messages.analytics.tasksDone}
              value={String(analytics.data.totalCompleted)}
            />
          </div>
        </>
      )}
    </section>
  )
}
