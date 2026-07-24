'use client'

import { useState } from 'react'
import { Card, Skeleton } from '@lifedeck/ui'
import type { AnalyticsView } from '@lifedeck/application'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useAnalytics } from '@/lib/api/use-analytics'

type RangeKey = 'weekly' | 'monthly' | 'yearly'
type Bucket = { label: string; value: number; total: number }

const RANGES: Record<
  RangeKey,
  { days: number; bucket: 'day' | 'month' | 'year' }
> = {
  weekly: { days: 7, bucket: 'day' },
  monthly: { days: 180, bucket: 'month' },
  yearly: { days: 2190, bucket: 'year' },
}

const TABS: RangeKey[] = ['weekly', 'monthly', 'yearly']

function dayFrom(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`)
}

function bucketize(
  days: AnalyticsView['days'],
  bucket: 'day' | 'month' | 'year',
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
      total: day.total,
    }))
  }

  if (bucket === 'month') {
    const month = new Intl.DateTimeFormat(locale, {
      month: 'short',
      timeZone: 'UTC',
    })
    const byMonth = new Map<string, { value: number; total: number }>()
    for (const day of days) {
      const key = day.date.slice(0, 7)
      const acc = byMonth.get(key) ?? { value: 0, total: 0 }
      acc.value += day.completed
      acc.total += day.total
      byMonth.set(key, acc)
    }
    return Array.from(byMonth.entries()).map(([key, acc]) => ({
      label: month.format(new Date(`${key}-01T00:00:00.000Z`)),
      value: acc.value,
      total: acc.total,
    }))
  }

  const byYear = new Map<string, { value: number; total: number }>()
  for (const day of days) {
    const key = day.date.slice(0, 4)
    const acc = byYear.get(key) ?? { value: 0, total: 0 }
    acc.value += day.completed
    acc.total += day.total
    byYear.set(key, acc)
  }
  return Array.from(byYear.entries()).map(([key, acc]) => ({
    label: key,
    value: acc.value,
    total: acc.total,
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
  const hasTasks = buckets.some(b => b.total > 0)
  if (!hasTasks) {
    return (
      <div className="text-ink-400 flex h-40 items-center justify-center text-sm">
        {empty}
      </div>
    )
  }

  return (
    <div className="flex h-40 items-end justify-between gap-1.5">
      {buckets.map((bucket, index) => {
        const last = index === buckets.length - 1
        const pct =
          bucket.total > 0 ? Math.round((bucket.value / bucket.total) * 100) : 0
        return (
          <div
            key={`${bucket.label}-${index}`}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              title={`${bucket.label}: ${pct}%`}
              className={`w-full max-w-[32px] rounded-[8px_8px_3px_3px] transition-[height] duration-500 ${
                last
                  ? 'to-brand-600 bg-gradient-to-b from-violet-500'
                  : 'bg-brand-200'
              }`}
              style={{
                height: `${Math.max(pct, bucket.total > 0 ? 4 : 0)}%`,
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
    <Card className="flex flex-col gap-0.5 p-4">
      <span
        className={`text-[28px] font-extrabold tracking-[-0.02em] ${
          accent ? 'text-violet-500' : 'text-ink-900'
        }`}
      >
        {value}
      </span>
      <span className="text-ink-500 text-[12.5px]">{label}</span>
    </Card>
  )
}

function StreakBadge({ streak, label }: { streak: number; label: string }) {
  return (
    <span
      className="inline-flex h-6 flex-none items-center gap-1 rounded-full px-2 text-[12px] font-extrabold"
      style={{
        background: 'oklch(0.72 0.17 60 / 0.14)',
        color: 'oklch(0.55 0.15 55)',
      }}
      title={label}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 2c1 3 3 4 3 7a3 3 0 0 1-6 0c0-1 .3-1.7.8-2.6C9 8 7.5 9.6 7.5 12.5A4.5 4.5 0 0 0 12 22a6 6 0 0 0 6-6c0-4.5-3.5-6.5-6-14z" />
      </svg>
      {streak}
    </span>
  )
}

function HabitsSection({
  habits,
  t,
}: {
  habits: AnalyticsView['habits']
  t: ReturnType<typeof useI18n>['messages']['analytics']
}) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-ink-900 text-lg font-bold tracking-[-0.01em]">
        {t.habitsTitle}
      </h2>
      {habits.active === 0 ? (
        <Card className="text-ink-500 p-6 text-center text-sm">
          {t.habitsEmpty}
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-ink-500 text-sm">{t.consistency}</span>
              <span className="text-brand-700 text-[40px] font-extrabold leading-none tracking-[-0.03em]">
                {Math.round(habits.consistency * 100)}%
              </span>
            </div>
            <ul className="flex flex-col gap-4">
              {habits.items.map(item => {
                const pct =
                  item.expected > 0
                    ? Math.min(
                        100,
                        Math.round((item.completions / item.expected) * 100),
                      )
                    : 0
                return (
                  <li key={item.id} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-ink-800 min-w-0 truncate text-sm font-semibold">
                        {item.title}
                      </span>
                      <div className="flex flex-none items-center gap-2">
                        <span className="text-ink-500 text-[12.5px] tabular-nums">
                          {item.completions} {t.expectedOf} {item.expected}
                        </span>
                        {item.currentStreak > 0 && (
                          <StreakBadge
                            streak={item.currentStreak}
                            label={t.bestStreak}
                          />
                        )}
                      </div>
                    </div>
                    <div className="bg-line h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="to-brand-600 h-full rounded-full bg-gradient-to-r from-violet-500 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label={t.activeHabits} value={String(habits.active)} />
            <StatCard label={t.checkIns} value={String(habits.completions)} />
            <StatCard
              label={t.bestStreak}
              value={String(habits.bestStreak)}
              accent
            />
          </div>
        </>
      )}
    </div>
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
        <h1 className="text-[28px] font-bold tracking-[-0.02em]">
          {messages.analytics.title}
        </h1>
        <p className="text-ink-500 text-sm">{messages.analytics.subtitle}</p>
      </header>

      <div className="border-line flex gap-[3px] rounded-[14px] border bg-white p-[3px]">
        {TABS.map(tab => {
          const active = tab === range
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setRange(tab)}
              aria-pressed={active}
              className={`h-[38px] flex-1 rounded-[11px] text-[13.5px] font-semibold transition ${
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-ink-600 hover:text-ink-800'
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
        (() => {
          const bucket = RANGES[range].bucket
          const buckets = bucketize(analytics.data.days, bucket, locale)
          const scope = bucket === 'day' ? buckets : buckets.slice(-1)
          const totalTasks = scope.reduce((sum, b) => sum + b.total, 0)
          const completedTasks = scope.reduce((sum, b) => sum + b.value, 0)
          const rate = totalTasks > 0 ? completedTasks / totalTasks : 0
          return (
            <>
              <Card className="flex flex-col gap-5 p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                  <span className="text-ink-500 text-sm">
                    {messages.analytics.completionRate}
                  </span>
                  <div className="flex items-end gap-3">
                    <span className="text-brand-700 text-[40px] font-extrabold leading-none tracking-[-0.03em]">
                      {Math.round(rate * 100)}%
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
                  buckets={buckets}
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

              <HabitsSection
                habits={analytics.data.habits}
                t={messages.analytics}
              />
            </>
          )
        })()
      )}
    </section>
  )
}
