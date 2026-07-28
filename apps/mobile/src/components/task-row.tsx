// RN port of apps/web/src/components/daily-task-row.tsx. The web row doubles as
// a dnd-kit drag handle; on native reordering lives in the list (long-press +
// move buttons), so this is purely the row body.
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import type { QueryKey } from '@tanstack/react-query'
import type {
  MemberView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import {
  CheckSquareIcon,
  ChevronRightIcon,
  LockIcon,
  NoteIcon,
  RecurringIcon,
} from '@/components/icons'
import { TaskSheet } from '@/components/task-sheet'
import { TaskCheckbox } from '@/components/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

export type TaskRowProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  boardKey: QueryKey
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onDelete?: (task: TaskView) => void
  onLongPress?: () => void
  dragging?: boolean
}

export function TaskRow({
  task,
  members,
  self,
  boardKey,
  onToggle,
  onUpdate,
  onDelete,
  onLongPress,
  dragging = false,
}: TaskRowProps) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.task
  const completed = task.status === 'completed'
  const [sheetOpen, setSheetOpen] = useState(false)

  const subtaskTotal = task.subtasks.total
  const subtaskDone = task.subtasks.completed
  const subtaskPct = subtaskTotal
    ? Math.round((subtaskDone / subtaskTotal) * 100)
    : 0

  return (
    <View
      className={cn(
        'border-line bg-surface min-h-[56px] flex-row items-center gap-3 border-b py-2.5 pl-4 pr-1.5',
        dragging && 'opacity-40',
      )}
    >
      <TaskCheckbox
        checked={completed}
        label={task.title}
        onChange={() => onToggle(task)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.edit}
        onPress={() => setSheetOpen(true)}
        onLongPress={onLongPress}
        className="min-w-0 flex-1 gap-[3px]"
      >
        <Text
          className={cn(
            'text-[15px]',
            completed ? 'text-ink-500 line-through' : 'text-ink-800',
          )}
        >
          {task.title}
        </Text>
        {task.observation ? (
          <View className="flex-row items-center gap-1.5">
            <NoteIcon size={11} color={colors.ink['500']} />
            <Text
              className="text-ink-500 flex-1 text-[12.5px]"
              numberOfLines={1}
            >
              {task.observation}
            </Text>
          </View>
        ) : null}
        {subtaskTotal > 0 ? (
          <View className="flex-row items-center gap-1.5">
            <CheckSquareIcon size={11} color={colors.ink['400']} />
            <Text className="text-ink-400 text-xs font-semibold">
              {messages.subtask.progress
                .replace('{done}', String(subtaskDone))
                .replace('{total}', String(subtaskTotal))}
            </Text>
            <View className="bg-line h-1 w-10 overflow-hidden rounded-full">
              <View
                className="bg-brand-600 h-full rounded-full"
                style={{ width: `${subtaskPct}%` }}
              />
            </View>
          </View>
        ) : null}
      </Pressable>

      <View className="flex-row items-center">
        {task.isPrivate ? (
          <View className="px-0.5">
            <LockIcon size={13} color={colors.brand['500']} />
          </View>
        ) : null}
        {task.recurringTaskId ? (
          <View className="px-0.5">
            <RecurringIcon size={13} color={colors.brand['300']} />
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.edit}
          onPress={() => setSheetOpen(true)}
          className="h-[34px] w-[34px] items-center justify-center"
        >
          <ChevronRightIcon size={16} color={colors.ink['300']} />
        </Pressable>
      </View>

      {/* Mounted only while open: a board can hold dozens of rows, and each
          sheet is a native Modal plus a subtasks query. */}
      {sheetOpen ? (
        <TaskSheet
          task={task}
          members={members}
          self={self}
          boardKey={boardKey}
          open
          onClose={() => setSheetOpen(false)}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ) : null}
    </View>
  )
}
