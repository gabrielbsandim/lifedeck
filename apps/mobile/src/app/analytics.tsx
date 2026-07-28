// RN port of apps/web/src/components/analytics-screen.tsx. The bucketing and
// trend math are the web's verbatim; the CSS bar chart becomes flex-height
// views, which behave the same.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { AnalyticsView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'
import { FlameIcon } from '@/components/icons'
import { Card, Screen, Skeleton } from '@/components/ui'
import { useAnalytics } from '@/lib/api/use-analytics'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

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
      <View className="h-40 items-center justify-center">
        <Text className="text-ink-400 text-sm">{empty}</Text>
      </View>
    )
  }

  return (
    <View className="h-40 flex-row items-end justify-between gap-1.5">
      {buckets.map((bucket, index) => {
        const last = index === buckets.length - 1
        const pct =
          bucket.total > 0 ? Math.round((bucket.value / bucket.total) * 100) : 0
        return (
          <View
            key={`${bucket.label}-${index}`}
            className="h-full min-w-0 flex-1 items-center justify-end gap-2"
          >
            <View
              accessibilityLabel={`${bucket.label}: ${pct}%`}
              className={cn(
                'w-full max-w-[32px] rounded-t-lg',
                last ? 'bg-brand-600' : 'bg-brand-200',
              )}
              style={{
                height: `${Math.max(pct, bucket.total > 0 ? 4 : 0)}%`,
              }}
            />
            <Text className="text-ink-400 text-[10px]" numberOfLines={1}>
              {bucket.label}
            </Text>
          </View>
        )
      })}
    </View>
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
    <Card className="flex-1 gap-0.5 p-4">
      <Text
        className={cn(
          'text-[28px] font-extrabold',
          accent ? 'text-violet-500' : 'text-ink-900',
        )}
      >
        {value}
      </Text>
      <Text className="text-ink-500 text-[12.5px]">{label}</Text>
    </Card>
  )
}

function HabitsSection({
  habits,
  t,
}: {
  habits: AnalyticsView['habits']
  t: Messages['analytics']
}) {
  const colors = useThemeColors()

  return (
    <View className="gap-3">
      <Text className="text-ink-900 text-lg font-bold">{t.habitsTitle}</Text>
      {habits.active === 0 ? (
        <Card className="p-6">
          <Text className="text-ink-500 text-center text-sm">
            {t.habitsEmpty}
          </Text>
        </Card>
      ) : (
        <>
          <Card className="gap-5 p-5">
            <View className="gap-1">
              <Text className="text-ink-500 text-sm">{t.consistency}</Text>
              <Text className="text-brand-accent-strong text-[40px] font-extrabold">
                {Math.round(habits.consistency * 100)}%
              </Text>
            </View>
            <View className="gap-4">
              {habits.items.map(item => {
                const pct =
                  item.expected > 0
                    ? Math.min(
                        100,
                        Math.round((item.completions / item.expected) * 100),
                      )
                    : 0
                return (
                  <View key={item.id} className="gap-2">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="text-ink-800 min-w-0 flex-1 text-sm font-semibold"
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-ink-500 text-[12.5px]">
                          {item.completions} {t.expectedOf} {item.expected}
                        </Text>
                        {item.currentStreak > 0 ? (
                          <View
                            accessibilityLabel={t.bestStreak}
                            className="bg-warning/20 h-6 flex-row items-center gap-1 rounded-full px-2"
                          >
                            <FlameIcon size={12} color={colors.warning} />
                            <Text className="text-warning text-[12px] font-extrabold">
                              {item.currentStreak}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View className="bg-line h-2 overflow-hidden rounded-full">
                      <View
                        className="bg-brand-600 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </View>
                  </View>
                )
              })}
            </View>
          </Card>

          <View className="flex-row gap-3">
            <StatCard label={t.activeHabits} value={String(habits.active)} />
            <StatCard label={t.checkIns} value={String(habits.completions)} />
            <StatCard
              label={t.bestStreak}
              value={String(habits.bestStreak)}
              accent
            />
          </View>
        </>
      )}
    </View>
  )
}

export default function AnalyticsScreen() {
  const { messages, locale } = useI18n()
  const [range, setRange] = useState<RangeKey>('weekly')
  const { days, bucket } = RANGES[range]
  const analytics = useAnalytics(days)

  const buckets = analytics.data
    ? bucketize(analytics.data.days, bucket, locale)
    : []
  const scope = bucket === 'day' ? buckets : buckets.slice(-1)
  const totalTasks = scope.reduce((sum, b) => sum + b.total, 0)
  const completedTasks = scope.reduce((sum, b) => sum + b.value, 0)
  const rate = totalTasks > 0 ? completedTasks / totalTasks : 0
  const delta = analytics.data ? trendPct(analytics.data.days) : null

  return (
    <Screen
      refreshing={analytics.isRefetching}
      onRefresh={() => void analytics.refetch()}
    >
      <View className="gap-1">
        <Text className="text-ink-900 text-[28px] font-bold">
          {messages.analytics.title}
        </Text>
        <Text className="text-ink-500 text-sm">
          {messages.analytics.subtitle}
        </Text>
      </View>

      <View className="border-line bg-surface flex-row gap-[3px] rounded-[14px] border p-[3px]">
        {TABS.map(tab => {
          const active = tab === range
          return (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setRange(tab)}
              className={cn(
                'h-[38px] flex-1 items-center justify-center rounded-[11px]',
                active && 'bg-brand-600',
              )}
            >
              <Text
                className={cn(
                  'text-[13.5px] font-semibold',
                  active ? 'text-white' : 'text-ink-600',
                )}
              >
                {messages.analytics[tab]}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {analytics.isPending ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : analytics.isError || !analytics.data ? (
        <Card className="p-8">
          <Text className="text-ink-500 text-center text-sm">
            {messages.common.error}
          </Text>
        </Card>
      ) : (
        <>
          <Card className="gap-5 p-5">
            <View className="gap-1">
              <Text className="text-ink-500 text-sm">
                {messages.analytics.completionRate}
              </Text>
              <View className="flex-row items-end gap-3">
                <Text className="text-brand-accent-strong text-[40px] font-extrabold">
                  {Math.round(rate * 100)}%
                </Text>
                {delta !== null ? (
                  <Text
                    className={cn(
                      'pb-1 text-sm font-semibold',
                      delta >= 0 ? 'text-success' : 'text-danger',
                    )}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta}%
                  </Text>
                ) : null}
              </View>
            </View>
            <CompletionChart
              buckets={buckets}
              empty={messages.analytics.empty}
            />
          </Card>

          <View className="flex-row gap-3">
            <StatCard
              label={messages.analytics.dayStreak}
              value={String(analytics.data.currentStreak)}
              accent
            />
            <StatCard
              label={messages.analytics.tasksDone}
              value={String(analytics.data.totalCompleted)}
            />
          </View>

          <HabitsSection
            habits={analytics.data.habits}
            t={messages.analytics}
          />
        </>
      )}
    </Screen>
  )
}
