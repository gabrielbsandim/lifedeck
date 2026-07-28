// RN port of apps/web/src/components/daily-board.tsx: the greeting header, the
// day stepper, the completion ring, yesterday's leftovers, the add-task field
// and the task list.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { TaskView, UpdateTaskInput } from '@lifedeck/application'
import {
  CalendarIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ShareIcon,
} from '@/components/icons'
import { NotificationBell } from '@/components/notification-bell'
import { ProgressRing } from '@/components/progress-ring'
import { ReorderableList } from '@/components/reorderable-list'
import { ShareDialog } from '@/components/share-dialog'
import { TaskRow } from '@/components/task-row'
import { Button, Card, EmptyState, LogoMark, Skeleton } from '@/components/ui'
import { DateField } from '@/components/date-time-picker'
import { addDays, todayIso } from '@/lib/api/dates'
import {
  dailyBoardKey,
  useBringTaskToToday,
  useCreateTask,
  useDailyBoard,
  useDeleteDailyTask,
  useReorderDailyTasks,
  useUpdateTask,
} from '@/lib/api/use-daily-board'
import { useMembers } from '@/lib/api/use-share'
import { useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

function formatDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

function formatShortDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(parsed)
}

function greetingFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function DailyBoard({
  date,
  onDateChange,
}: {
  date: string
  onDateChange: (date: string) => void
}) {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const board = useDailyBoard(date)
  const session = useSession()
  const listId = board.data?.list.id ?? ''
  const members = useMembers(listId, listId !== '')
  const createTask = useCreateTask(date)
  const updateTask = useUpdateTask(date)
  const deleteTask = useDeleteDailyTask(date)
  const reorderTasks = useReorderDailyTasks(date, listId)
  const bringTask = useBringTaskToToday(date)
  const [title, setTitle] = useState('')
  const [shareOpen, setShareOpen] = useState(false)

  const today = todayIso()
  const isToday = date === today

  if (board.isPending) {
    return <Skeleton className="h-72 w-full rounded-2xl" />
  }
  if (board.isError) {
    return (
      <Card className="items-center gap-3 p-8">
        <Text className="text-ink-500 text-sm">{messages.common.error}</Text>
        <Button variant="ghost" onPress={() => board.refetch()}>
          {messages.common.retry}
        </Button>
      </Card>
    )
  }

  const { list, tasks, carryOver } = board.data
  // Keep unchecked tasks first and move completed ones to the end, preserving
  // their relative order within each group (Array.prototype.sort is stable).
  const rows = [...tasks].sort(
    (a, b) =>
      Number(a.status === 'completed') - Number(b.status === 'completed'),
  )
  const doneCount = tasks.filter(task => task.status === 'completed').length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const allDone = tasks.length > 0 && doneCount === tasks.length
  const progressLabel = messages.task.progress
    .replace('{done}', String(doneCount))
    .replace('{total}', String(tasks.length))

  function addTask() {
    const trimmed = title.trim()
    if (!trimmed) {
      return
    }
    createTask.mutate(
      { listId: list.id, title: trimmed },
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

  function removeTask(task: TaskView) {
    deleteTask.mutate(task.id)
  }

  const self = session.data
    ? { id: session.data.id, name: session.data.displayName }
    : null
  const firstName = session.data?.displayName.trim().split(/\s+/)[0] ?? ''
  const greeting = messages.home[greetingFor(new Date().getHours())]

  return (
    <View className="gap-3">
      <View className="gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row items-center gap-2">
            <LogoMark size={20} />
            <Text className="text-brand-accent text-sm font-medium">
              {messages.app.name}
            </Text>
          </View>
          <NotificationBell />
        </View>
        <View className="gap-1.5">
          <Text className="text-ink-900 text-[28px] font-bold">
            {firstName ? `${greeting}, ${firstName}` : greeting}
          </Text>
          <View className="flex-row items-center gap-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.home.previousDay}
              onPress={() => onDateChange(addDays(date, -1))}
              className="h-7 w-7 items-center justify-center rounded-lg"
            >
              <ChevronLeftIcon size={18} color={colors.ink['400']} />
            </Pressable>
            <DatePill
              date={date}
              label={formatDate(date, locale)}
              onChange={onDateChange}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.home.nextDay}
              onPress={() => onDateChange(addDays(date, 1))}
              className="h-7 w-7 items-center justify-center rounded-lg"
            >
              <ChevronRightIcon size={18} color={colors.ink['400']} />
            </Pressable>
            {!isToday ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onDateChange(today)}
                className="bg-brand-50 ml-1 rounded-lg px-2 py-0.5"
              >
                <Text className="text-brand-accent text-xs font-semibold">
                  {messages.home.goToToday}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      <ShareDialog
        listId={list.id}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />

      <Card className="flex-row items-center gap-3.5 p-4">
        <ProgressRing percent={pct} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-ink-900 text-[15px] font-semibold">
            {progressLabel}
          </Text>
          <Text
            className={
              allDone
                ? 'text-sm font-semibold text-violet-500'
                : 'text-ink-500 text-sm'
            }
          >
            {allDone ? messages.task.allDone : messages.home.keepGoing}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={messages.list.share}
          onPress={() => setShareOpen(true)}
          className="bg-brand-50 h-10 w-10 items-center justify-center rounded-full"
        >
          <ShareIcon size={17} color={colors.brand.accentStrong} />
        </Pressable>
      </Card>

      {carryOver.length > 0 ? (
        <View className="bg-brand-50 border-brand-100 rounded-2xl border p-4">
          <Text className="text-brand-accent-strong mb-2 text-[13px] font-bold">
            {messages.carryOver.pendingTitle}
          </Text>
          {carryOver.map(item => (
            <View
              key={item.task.id}
              className="flex-row items-center gap-2.5 py-1"
            >
              <View className="min-w-0 flex-1">
                <Text className="text-ink-800 text-sm" numberOfLines={1}>
                  {item.task.title}
                </Text>
                <Text className="text-ink-400 text-xs">
                  {messages.carryOver.broughtFrom.replace(
                    '{date}',
                    formatShortDate(item.fromDate, locale),
                  )}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={
                  bringTask.isPending && bringTask.variables === item.task.id
                }
                onPress={() => bringTask.mutate(item.task.id)}
                className="bg-surface h-8 justify-center rounded-full px-3"
              >
                <Text className="text-brand-accent-strong text-[12.5px] font-semibold">
                  {messages.carryOver.bring}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

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

      {tasks.length === 0 ? (
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
                boardKey={dailyBoardKey(date)}
                onToggle={toggle}
                onUpdate={update}
                onDelete={removeTask}
                onLongPress={onLongPress}
              />
            )}
          />
        </Card>
      )}
    </View>
  )
}

// The web opens a native date input from a small label button; the RN picker
// needs its own trigger, so the label and the picker are paired here.
function DatePill({
  date,
  label,
  onChange,
}: {
  date: string
  label: string
  onChange: (date: string) => void
}) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <View className="flex-1">
        <DateField
          value={date}
          display={label}
          // The pill was the trigger, so the picker shows immediately rather
          // than making the user tap the field it was replaced by.
          defaultOpen
          onDismiss={() => setOpen(false)}
          onChange={onChange}
        />
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={messages.home.pickDate}
      onPress={() => setOpen(true)}
      className="flex-row items-center gap-1.5 rounded-lg px-1.5 py-0.5"
    >
      <CalendarIcon size={14} color={colors.ink['500']} />
      <Text className="text-ink-500 text-sm font-medium">{label}</Text>
    </Pressable>
  )
}
