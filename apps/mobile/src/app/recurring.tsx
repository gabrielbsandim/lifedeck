// RN port of apps/web/src/components/recurring-tasks-manager.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { RecurringTaskView } from '@lifedeck/application'
import type { Messages } from '@lifedeck/i18n'
import {
  PencilIcon,
  PlusIcon,
  RecurringIcon,
  TrashIcon,
} from '@/components/icons'
import { RecurringTaskForm } from '@/components/recurring-task-form'
import { Button, Card, Screen, Skeleton } from '@/components/ui'
import {
  useCreateRecurringTask,
  useDeleteRecurringTask,
  useRecurringTasks,
  useUpdateRecurringTask,
} from '@/lib/api/use-recurring-tasks'
import { useI18n } from '@/lib/i18n/messages-provider'
import { weekdayLabels } from '@/lib/weekdays'
import { useThemeColors } from '@/theme/tokens'

function describeRule(
  rule: RecurringTaskView['rule'],
  locale: string,
  t: Messages['recurring'],
): string {
  const labels = weekdayLabels(locale)
  const every = t.interval
  if (rule.freq === 'weekly') {
    const days =
      rule.byWeekday && rule.byWeekday.length > 0
        ? rule.byWeekday.map(day => labels[day]).join(', ')
        : ''
    const base = rule.interval > 1 ? `${every} ${rule.interval} ×` : t.weekly
    return days ? `${base} · ${days}` : base
  }
  if (rule.freq === 'monthly') {
    const base = rule.interval > 1 ? `${every} ${rule.interval} ×` : t.monthly
    return rule.byMonthday ? `${base} · ${rule.byMonthday}` : base
  }
  return rule.interval > 1 ? `${every} ${rule.interval} ×` : t.daily
}

export default function RecurringScreen() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const t = messages.recurring
  const list = useRecurringTasks()
  const createTask = useCreateRecurringTask()
  const updateTask = useUpdateRecurringTask()
  const deleteTask = useDeleteRecurringTask()

  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const definitions = list.data?.pages.flatMap(page => page.items) ?? []

  return (
    <Screen
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
    >
      <View className="gap-1">
        <Text className="text-ink-900 text-2xl font-bold">{t.title}</Text>
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
      </View>

      {adding ? (
        <RecurringTaskForm
          isPending={createTask.isPending}
          onSubmit={input =>
            createTask.mutate(input, { onSuccess: () => setAdding(false) })
          }
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => setAdding(true)}
          className="border-brand-300 h-[50px] flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed"
        >
          <PlusIcon size={17} color={colors.brand.accent} />
          <Text className="text-brand-accent text-sm font-semibold">
            {t.add}
          </Text>
        </Pressable>
      )}

      {list.isPending ? (
        <View className="gap-2.5">
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          <Skeleton className="h-[72px] w-full rounded-2xl" />
          <Skeleton className="h-[72px] w-full rounded-2xl" />
        </View>
      ) : null}

      {list.isError ? (
        <Card className="items-center gap-3 py-8">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button onPress={() => list.refetch()}>
            {messages.common.retry}
          </Button>
        </Card>
      ) : null}

      {list.isSuccess && definitions.length === 0 && !adding ? (
        <Card className="items-center gap-3 px-6 py-11">
          <View className="bg-brand-50 h-16 w-16 items-center justify-center rounded-full">
            <RecurringIcon size={30} color={colors.brand.accent} />
          </View>
          <Text className="text-ink-900 text-[17px] font-bold">
            {t.emptyTitle}
          </Text>
          <Text className="text-ink-500 text-center text-sm">
            {t.emptyBody}
          </Text>
          <Button onPress={() => setAdding(true)}>{t.emptyCta}</Button>
        </Card>
      ) : null}

      {list.isSuccess && definitions.length > 0 ? (
        <View className="gap-2.5">
          {definitions.map(definition =>
            editingId === definition.id ? (
              <RecurringTaskForm
                key={definition.id}
                initial={{ title: definition.title, rule: definition.rule }}
                isPending={updateTask.isPending}
                onSubmit={input =>
                  updateTask.mutate(
                    { id: definition.id, input },
                    { onSuccess: () => setEditingId(null) },
                  )
                }
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <Card
                key={definition.id}
                className="flex-row items-center gap-3.5 p-3.5 pl-4"
              >
                <View className="bg-brand-50 h-10 w-10 items-center justify-center rounded-xl">
                  <RecurringIcon size={18} color={colors.brand.accent} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-ink-900 text-[15px] font-semibold"
                    numberOfLines={1}
                  >
                    {definition.title}
                  </Text>
                  <Text className="text-ink-500 mt-0.5 text-[13px]">
                    {describeRule(definition.rule, locale, t)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.edit}
                  onPress={() => setEditingId(definition.id)}
                  className="h-9 w-9 items-center justify-center rounded-lg"
                >
                  <PencilIcon size={17} color={colors.brand.accent} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t.delete}
                  onPress={() => deleteTask.mutate(definition.id)}
                  className="h-9 w-9 items-center justify-center rounded-lg"
                >
                  <TrashIcon size={17} color={colors.ink['400']} />
                </Pressable>
              </Card>
            ),
          )}
        </View>
      ) : null}

      {list.hasNextPage ? (
        <Button
          variant="ghost"
          className="border-line self-start border"
          isLoading={list.isFetchingNextPage}
          onPress={() => list.fetchNextPage()}
        >
          {messages.common.loadMore}
        </Button>
      ) : null}
    </Screen>
  )
}
