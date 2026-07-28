// RN port of apps/web/src/components/standalone-list-view.tsx. The web puts a
// "back to lists" link in the body; the native stack header already owns that,
// so it is dropped here.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import type { TaskView, UpdateTaskInput } from '@lifedeck/application'
import {
  CheckSquareIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
} from '@/components/icons'
import { ReorderableList } from '@/components/reorderable-list'
import { ShareDialog } from '@/components/share-dialog'
import { TaskRow } from '@/components/task-row'
import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Screen,
  Skeleton,
  TextField,
} from '@/components/ui'
import {
  listTasksKey,
  useCreateListTask,
  useDeleteList,
  useDeleteListTask,
  useLeaveList,
  useList,
  useListTasks,
  useRenameList,
  useReorderListTasks,
  useUpdateListTask,
} from '@/lib/api/use-lists'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

export default function ListDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const listId = params.id ?? ''
  const { messages } = useI18n()
  const colors = useThemeColors()
  const router = useRouter()
  const list = useList(listId)
  const tasks = useListTasks(listId)
  const session = useSession()
  const isOwner = Boolean(
    list.data && session.data && list.data.ownerId === session.data.id,
  )
  const members = useMembers(listId, isOwner && listId !== '')
  const createTask = useCreateListTask(listId)
  const updateTask = useUpdateListTask(listId)
  const deleteTask = useDeleteListTask(listId)
  const reorderTasks = useReorderListTasks(listId)
  const renameList = useRenameList(listId)
  const deleteList = useDeleteList()
  const leaveList = useLeaveList()
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [listTitle, setListTitle] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [confirmingLeave, setConfirmingLeave] = useState(false)

  if (list.isPending || tasks.isPending) {
    return (
      <Screen>
        <Skeleton className="h-72 w-full rounded-2xl" />
      </Screen>
    )
  }
  if (list.isError || tasks.isError) {
    return (
      <Screen>
        <Card className="items-center gap-3 p-8">
          <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
          <Button variant="ghost" onPress={() => router.back()}>
            {messages.lists.back}
          </Button>
        </Card>
      </Screen>
    )
  }

  // Keep unchecked tasks first and move completed ones to the end, preserving
  // their relative order within each group (Array.prototype.sort is stable).
  const rows = [...tasks.data].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed'),
  )
  const doneCount = rows.filter(task => task.status === 'completed').length
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0
  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(rows.length))

  function addTask() {
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createTask.mutate(
      { listId, title: trimmed },
      { onSuccess: () => setTitle('') },
    )
  }

  function toggle(task: TaskView) {
    updateTask.mutate({
      id: task.id,
      input: {
        status: task.status === 'completed' ? 'pending' : 'completed',
      },
    })
  }

  function update(id: string, input: UpdateTaskInput) {
    updateTask.mutate({ id, input })
  }

  function submitRename() {
    const trimmed = listTitle.trim()
    if (!trimmed) {
      return
    }
    renameList.mutate(
      { title: trimmed },
      { onSuccess: () => setEditingTitle(false) },
    )
  }

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null

  return (
    <Screen>
      <Stack.Screen options={{ title: list.data.title }} />

      <View className="flex-row items-center justify-between gap-3">
        {isOwner && editingTitle ? (
          <View className="flex-1 flex-row gap-2">
            <View className="flex-1">
              <TextField
                value={listTitle}
                onChangeText={setListTitle}
                onSubmitEditing={submitRename}
                accessibilityLabel={messages.lists.namePlaceholder}
                maxLength={120}
                autoFocus
              />
            </View>
            <Button isLoading={renameList.isPending} onPress={submitRename}>
              {messages.recurring.save}
            </Button>
          </View>
        ) : (
          <Pressable
            accessibilityRole={isOwner ? 'button' : undefined}
            disabled={!isOwner}
            onPress={() => {
              setListTitle(list.data.title)
              setEditingTitle(true)
            }}
            className="min-w-0 flex-1"
          >
            <Text
              className="text-ink-800 text-2xl font-semibold"
              numberOfLines={2}
            >
              {list.data.title}
            </Text>
          </Pressable>
        )}

        {isOwner && !editingTitle ? (
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.list.share}
              onPress={() => setShareOpen(true)}
              className="bg-brand-600 h-9 flex-row items-center gap-1.5 rounded-xl px-3.5"
            >
              <ShareIcon size={15} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">
                {messages.list.share}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.recurring.delete}
              onPress={() => setConfirmingDelete(true)}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <TrashIcon size={18} color={colors.ink['400']} />
            </Pressable>
          </View>
        ) : null}

        {!isOwner ? (
          <View className="flex-row items-center gap-2">
            <Badge tone="shared">{messages.list.shared}</Badge>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.lists.leave}
              onPress={() => setConfirmingLeave(true)}
              className="h-9 w-9 items-center justify-center rounded-xl"
            >
              <TrashIcon size={18} color={colors.ink['400']} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isOwner ? (
        <ShareDialog
          listId={listId}
          open={shareOpen}
          onClose={() => setShareOpen(false)}
        />
      ) : null}

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={messages.lists.deleteTitle}
      >
        <View className="gap-4">
          <Text className="text-ink-500 text-sm">
            {messages.lists.deleteBody}
          </Text>
          <View className="flex-row gap-2">
            <Button
              className="bg-danger h-9 flex-1"
              isLoading={deleteList.isPending}
              onPress={() =>
                deleteList.mutate(listId, {
                  onSuccess: () => router.replace('/lists'),
                })
              }
            >
              {messages.recurring.delete}
            </Button>
            <Button
              variant="ghost"
              className="h-9"
              onPress={() => setConfirmingDelete(false)}
            >
              {messages.recurring.cancel}
            </Button>
          </View>
        </View>
      </Dialog>

      <Dialog
        open={confirmingLeave}
        onClose={() => setConfirmingLeave(false)}
        title={messages.lists.leaveTitle}
      >
        <View className="gap-4">
          <Text className="text-ink-500 text-sm">
            {messages.lists.leaveBody}
          </Text>
          <View className="flex-row gap-2">
            <Button
              className="bg-danger h-9 flex-1"
              isLoading={leaveList.isPending}
              onPress={() =>
                leaveList.mutate(listId, {
                  onSuccess: () => router.replace('/lists'),
                })
              }
            >
              {messages.lists.leave}
            </Button>
            <Button
              variant="ghost"
              className="h-9"
              onPress={() => setConfirmingLeave(false)}
            >
              {messages.recurring.cancel}
            </Button>
          </View>
        </View>
      </Dialog>

      <Card className="gap-2 p-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="text-ink-700 text-sm font-semibold">
            {progressLabel}
          </Text>
          <Text className="text-brand-accent-strong text-[19px] font-extrabold">
            {pct}%
          </Text>
        </View>
        <View className="bg-line h-[7px] overflow-hidden rounded-full">
          <View
            className="bg-brand-600 h-full rounded-full"
            style={{ width: `${pct}%` }}
          />
        </View>
      </Card>

      <View className="flex-row gap-2">
        <TextInput
          value={title}
          onChangeText={setTitle}
          onSubmitEditing={addTask}
          returnKeyType="done"
          placeholder={messages.task.add}
          placeholderTextColor={colors.ink['400']}
          accessibilityLabel={messages.task.add}
          maxLength={280}
          className="border-line text-ink-800 bg-surface h-12 flex-1 rounded-[14px] border-[1.5px] px-4 text-base"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.task.addAction}
          onPress={addTask}
          className="bg-brand-600 h-12 w-12 items-center justify-center rounded-[14px]"
        >
          <PlusIcon size={20} color="#ffffff" />
        </Pressable>
      </View>

      {rows.length === 0 ? (
        <EmptyState
          icon={<CheckSquareIcon size={22} color={colors.brand.accent} />}
          title={messages.task.empty}
          description={messages.task.emptyHint}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <ReorderableList
            items={rows}
            getId={task => task.id}
            onReorder={ids => reorderTasks.mutate(ids)}
            renderItem={(task, { onLongPress }) => (
              <TaskRow
                task={task}
                members={members.data ?? []}
                self={self}
                boardKey={listTasksKey(listId)}
                onToggle={toggle}
                onUpdate={update}
                onDelete={t => deleteTask.mutate(t.id)}
                onLongPress={onLongPress}
              />
            )}
          />
        </Card>
      )}
    </Screen>
  )
}
