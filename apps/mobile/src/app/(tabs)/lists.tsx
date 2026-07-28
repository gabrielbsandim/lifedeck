// RN port of apps/web/src/components/lists-manager.tsx.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Link, useRouter } from 'expo-router'
import type { ListView, TaskView } from '@lifedeck/application'
import { PlusIcon } from '@/components/icons'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Screen,
  Skeleton,
  TextField,
} from '@/components/ui'
import { todayIso } from '@/lib/api/dates'
import { useDailyBoard } from '@/lib/api/use-daily-board'
import {
  useCreateList,
  useListSummary,
  useUserLists,
} from '@/lib/api/use-lists'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

// The web tints each list dot from a fixed rotation; the same six hues here,
// as literal colors because they are decoration, not design tokens.
const DOT_COLORS = [
  '#9260da',
  '#10b981',
  '#f59e0b',
  '#6963ec',
  '#f43f5e',
  '#0ea5e9',
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
    <Link href="/" asChild>
      <Pressable className="bg-brand-600 overflow-hidden rounded-2xl p-5">
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <View className="rounded-full bg-white/20 px-2.5 py-1">
            <Text className="text-xs font-semibold text-white">
              {messages.nav.today}
            </Text>
          </View>
          {people.length > 0 ? (
            <View className="flex-row gap-1">
              {people.map(person => (
                <Avatar
                  key={person.id}
                  name={person.name}
                  src={person.avatarUrl}
                  size="sm"
                />
              ))}
            </View>
          ) : null}
        </View>
        <Text className="text-lg font-bold text-white">
          {messages.list.daily}
        </Text>
        <Text className="mb-3 text-sm text-white/80">
          {board.isPending ? ' ' : meta}
        </Text>
        <View className="h-1.5 overflow-hidden rounded-full bg-white/25">
          <View
            className="h-full rounded-full bg-white"
            style={{ width: `${pct}%` }}
          />
        </View>
      </Pressable>
    </Link>
  )
}

function ListSummaryCard({ list, index }: { list: ListView; index: number }) {
  const { messages } = useI18n()
  const router = useRouter()
  const summary = useListSummary(list.id)
  const { done, total, pct } = progressOf(summary.data ?? [])
  const shared = list.visibility === 'link'
  const dot = DOT_COLORS[index % DOT_COLORS.length]

  return (
    <Pressable onPress={() => router.push(`/lists/${list.id}`)}>
      <Card className="p-4">
        <View className="mb-3 flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: dot }}
            />
            <Text
              className="text-ink-800 flex-1 text-base font-semibold"
              numberOfLines={1}
            >
              {list.title}
            </Text>
          </View>
          <Badge tone={shared ? 'shared' : 'neutral'}>
            {shared ? messages.lists.sharedBadge : messages.lists.you}
          </Badge>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="bg-bg h-1.5 flex-1 overflow-hidden rounded-full">
            <View
              className={
                pct === 100
                  ? 'bg-success h-full rounded-full'
                  : 'bg-brand-600 h-full rounded-full'
              }
              style={{ width: `${pct}%` }}
            />
          </View>
          {summary.isPending ? (
            <Skeleton className="h-3 w-16 rounded-full" />
          ) : (
            <Text className="text-ink-500 text-xs font-semibold">
              {total > 0 ? `${done}/${total} · ${pct}%` : `${pct}%`}
            </Text>
          )}
        </View>
      </Card>
    </Pressable>
  )
}

export default function ListsScreen() {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const lists = useUserLists()
  const createList = useCreateList()
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  function submit() {
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
    <Screen
      refreshing={lists.isRefetching}
      onRefresh={() => void lists.refetch()}
    >
      <View className="gap-1">
        <Text className="text-ink-900 text-[28px] font-bold">
          {messages.lists.title}
        </Text>
        <Text className="text-ink-500 text-sm">{messages.lists.subtitle}</Text>
      </View>

      <TodayCard />

      {lists.isPending ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : lists.isError ? (
        <Card className="items-center gap-3 p-6">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button variant="ghost" onPress={() => lists.refetch()}>
            {messages.common.retry}
          </Button>
        </Card>
      ) : (
        <View className="gap-3">
          {standalone.map((list, index) => (
            <ListSummaryCard key={list.id} list={list} index={index} />
          ))}

          {lists.hasNextPage ? (
            <Button
              variant="ghost"
              isLoading={lists.isFetchingNextPage}
              onPress={() => lists.fetchNextPage()}
            >
              {messages.common.loadMore}
            </Button>
          ) : null}

          {creating ? (
            <Card className="gap-3 p-4">
              <TextField
                autoFocus
                value={title}
                onChangeText={setTitle}
                onSubmitEditing={submit}
                placeholder={messages.lists.namePlaceholder}
                accessibilityLabel={messages.lists.namePlaceholder}
                maxLength={120}
              />
              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  isLoading={createList.isPending}
                  disabled={!title.trim()}
                  onPress={submit}
                >
                  {messages.lists.create}
                </Button>
                <Button
                  variant="ghost"
                  onPress={() => {
                    setCreating(false)
                    setTitle('')
                  }}
                >
                  {messages.recurring.cancel}
                </Button>
              </View>
            </Card>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setCreating(true)}
              className="border-brand-300 h-12 flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed"
            >
              <PlusIcon size={18} color={colors.brand.accent} />
              <Text className="text-brand-accent text-sm font-semibold">
                {messages.lists.newList}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Screen>
  )
}
