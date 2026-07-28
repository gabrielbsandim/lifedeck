// RN port of apps/web/src/components/shared-board-view.tsx, reached through the
// `lifedeck://share/<token>` deep link (and the app-link form of the web's
// /share/<token> URL).
import { Text, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Skeleton,
  TaskCheckbox,
} from '@/components/ui'
import { useJoinSharedList, useSharedBoard } from '@/lib/api/use-shared-board'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'

export default function SharedBoardScreen() {
  const params = useLocalSearchParams<{ token: string }>()
  const token = params.token ?? ''
  const { messages } = useI18n()
  const router = useRouter()
  const board = useSharedBoard(token)
  const session = useSession()
  const join = useJoinSharedList(token)

  if (board.isPending || session.isPending) {
    return (
      <Screen>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </Screen>
    )
  }

  if (board.isError || !board.data) {
    return (
      <Screen>
        <Card className="items-center gap-3 p-8">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button variant="ghost" onPress={() => router.replace('/')}>
            {messages.app.name}
          </Button>
        </Card>
      </Screen>
    )
  }

  const { list, tasks, role } = board.data
  const canEdit = role === 'editor'
  const doneCount = tasks.filter(task => task.status === 'completed').length

  return (
    <Screen>
      <Stack.Screen options={{ title: list.title }} />

      <View className="gap-2">
        <Text className="text-brand-accent text-sm font-medium">
          {messages.app.name}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="text-ink-900 text-2xl font-semibold">
            {list.title}
          </Text>
          <Badge tone="shared">
            {canEdit ? messages.share.editable : messages.share.readOnly}
          </Badge>
        </View>
        <Text className="text-ink-500 text-sm">
          {messages.task.progress
            .replace('{done}', String(doneCount))
            .replace('{total}', String(tasks.length))}
        </Text>
      </View>

      {canEdit && session.data ? (
        <Button
          isLoading={join.isPending}
          onPress={() =>
            join.mutate(undefined, {
              onSuccess: () => router.replace(`/lists/${list.id}`),
            })
          }
        >
          {messages.share.join}
        </Button>
      ) : null}

      <Card className="p-4">
        {tasks.length === 0 ? (
          <EmptyState title={messages.task.empty} />
        ) : (
          <View className="gap-2">
            {tasks.map(task => {
              const completed = task.status === 'completed'
              return (
                <View
                  key={task.id}
                  className="border-line bg-surface flex-row items-center gap-3 rounded-xl border px-3.5 py-3"
                >
                  <TaskCheckbox
                    checked={completed}
                    label={task.title}
                    disabled
                    onChange={() => undefined}
                  />
                  <Text
                    className={cn(
                      'flex-1 text-sm',
                      completed ? 'text-ink-500 line-through' : 'text-ink-800',
                    )}
                  >
                    {task.title}
                  </Text>
                </View>
              )
            })}
          </View>
        )}
      </Card>
    </Screen>
  )
}
