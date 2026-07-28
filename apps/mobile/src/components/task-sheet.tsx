// RN port of apps/web/src/components/task-sheet.tsx: the bottom sheet that
// edits one task (title, note, subtasks, privacy, assignee, delete). Drafts are
// committed on blur, exactly like the web.
import { useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { QueryKey } from '@tanstack/react-query'
import type {
  MemberView,
  TaskView,
  UpdateTaskInput,
} from '@lifedeck/application'
import {
  CloseIcon,
  LockIcon,
  PlusIcon,
  RecurringIcon,
  TrashIcon,
  UserIcon,
} from '@/components/icons'
import { Switch, TaskCheckbox } from '@/components/ui'
import {
  useCreateSubtask,
  useDeleteSubtask,
  useSubtasks,
  useUpdateSubtask,
} from '@/lib/api/use-subtasks'
import { useI18n } from '@/lib/i18n/messages-provider'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

type AssigneeOption = { id: string; name: string }

export type TaskSheetProps = {
  task: TaskView
  members: MemberView[]
  self: { id: string; name: string } | null
  boardKey: QueryKey
  open: boolean
  onClose: () => void
  onToggle: (task: TaskView) => void
  onUpdate: (id: string, input: UpdateTaskInput) => void
  onDelete?: (task: TaskView) => void
}

function SubtaskSection({
  taskId,
  boardKey,
}: {
  taskId: string
  boardKey: QueryKey
}) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const query = useSubtasks(taskId, true)
  const createSubtask = useCreateSubtask(taskId, boardKey)
  const updateSubtask = useUpdateSubtask(taskId, boardKey)
  const deleteSubtask = useDeleteSubtask(taskId, boardKey)
  const subtasks = query.data ?? []
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed) {
      return
    }
    createSubtask.mutate({ title: trimmed })
    setDraft('')
  }

  return (
    <View className="border-line overflow-hidden rounded-2xl border">
      {subtasks.map(subtask => {
        const completed = subtask.status === 'completed'
        return (
          <View
            key={subtask.id}
            className="border-line min-h-[46px] flex-row items-center gap-2.5 border-b pl-3.5 pr-1.5"
          >
            <TaskCheckbox
              checked={completed}
              label={subtask.title}
              onChange={() =>
                updateSubtask.mutate({
                  id: subtask.id,
                  input: { status: completed ? 'pending' : 'completed' },
                })
              }
            />
            <Text
              className={cn(
                'flex-1 text-sm',
                completed ? 'text-ink-400 line-through' : 'text-ink-800',
              )}
            >
              {subtask.title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={messages.subtask.delete}
              onPress={() => deleteSubtask.mutate(subtask.id)}
              className="h-8 w-8 items-center justify-center"
            >
              <CloseIcon size={13} color={colors.ink['300']} />
            </Pressable>
          </View>
        )
      })}

      <View className="min-h-[46px] flex-row items-center gap-2.5 px-3.5">
        <PlusIcon size={14} color={colors.ink['300']} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          onBlur={add}
          returnKeyType="done"
          placeholder={messages.subtask.add}
          placeholderTextColor={colors.ink['400']}
          maxLength={280}
          className="text-ink-800 h-11 flex-1 text-sm"
        />
      </View>
    </View>
  )
}

export function TaskSheet({
  task,
  members,
  self,
  boardKey,
  open,
  onClose,
  onToggle,
  onUpdate,
  onDelete,
}: TaskSheetProps) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const t = messages.task
  const completed = task.status === 'completed'
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [noteDraft, setNoteDraft] = useState(task.observation ?? '')
  const [prevTaskId, setPrevTaskId] = useState(task.id)

  // Reset local drafts when a different task loads into this sheet, using the
  // render-time adjustment pattern rather than an effect.
  if (task.id !== prevTaskId) {
    setPrevTaskId(task.id)
    setTitleDraft(task.title)
    setNoteDraft(task.observation ?? '')
  }

  const subtaskTotal = task.subtasks.total
  const subtaskDone = task.subtasks.completed

  const options: AssigneeOption[] = [
    ...(self ? [{ id: self.id, name: self.name }] : []),
    ...members
      .filter(member => member.userId !== self?.id)
      .map(member => ({ id: member.userId, name: member.displayName })),
  ]

  function saveTitle() {
    const trimmed = titleDraft.trim()
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed })
    } else {
      setTitleDraft(task.title)
    }
  }

  function saveNote() {
    const trimmed = noteDraft.trim()
    const next = trimmed === '' ? null : trimmed
    if (next !== (task.observation ?? null)) {
      onUpdate(task.id, { observation: next })
    }
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        onPress={onClose}
        accessibilityLabel={messages.share.close}
        className="flex-1 justify-end bg-black/40"
      >
        <Pressable
          onPress={() => {}}
          className="bg-surface max-h-[86%] rounded-t-[24px] px-[18px] pb-9 pt-2.5"
        >
          <View className="bg-line mx-auto mb-3.5 h-1 w-10 rounded-full" />
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="flex-row items-center gap-3">
              <TaskCheckbox
                checked={completed}
                label={task.title}
                onChange={() => onToggle(task)}
              />
              <TextInput
                value={titleDraft}
                onChangeText={setTitleDraft}
                onBlur={saveTitle}
                onSubmitEditing={saveTitle}
                returnKeyType="done"
                accessibilityLabel={t.editTitle}
                maxLength={280}
                className={cn(
                  'flex-1 py-1 text-[17px] font-semibold',
                  completed ? 'text-ink-500 line-through' : 'text-ink-900',
                )}
              />
            </View>

            {task.recurringTaskId ? (
              <View className="ml-[38px] mt-1.5 flex-row">
                <View className="bg-brand-50 h-[22px] flex-row items-center gap-1.5 rounded-full px-2.5">
                  <RecurringIcon size={11} color={colors.brand.accentStrong} />
                  <Text className="text-brand-accent-strong text-[11.5px] font-bold">
                    {t.recurring}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text className="text-ink-500 pb-1.5 pt-4 text-xs font-semibold uppercase">
              {t.noteSection}
            </Text>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              onBlur={saveNote}
              onSubmitEditing={saveNote}
              returnKeyType="done"
              placeholder={t.notePlaceholder}
              placeholderTextColor={colors.ink['400']}
              accessibilityLabel={t.note}
              maxLength={2000}
              className="border-line text-ink-700 bg-bg h-[46px] rounded-[13px] border-[1.5px] px-3.5 text-sm"
            />

            <View className="flex-row items-baseline justify-between pb-1.5 pt-4">
              <Text className="text-ink-500 text-xs font-semibold uppercase">
                {messages.subtask.title}
              </Text>
              {subtaskTotal > 0 ? (
                <Text className="text-ink-400 text-xs">
                  {messages.subtask.progress
                    .replace('{done}', String(subtaskDone))
                    .replace('{total}', String(subtaskTotal))}
                </Text>
              ) : null}
            </View>
            <SubtaskSection taskId={task.id} boardKey={boardKey} />

            <View className="border-line mt-4 overflow-hidden rounded-2xl border">
              <View className="border-line min-h-[50px] flex-row items-center gap-2.5 border-b px-3.5">
                <LockIcon size={16} color={colors.ink['500']} />
                <Text className="text-ink-800 flex-1 text-sm">{t.private}</Text>
                <Switch
                  value={task.isPrivate}
                  accessibilityLabel={t.togglePrivacy}
                  onValueChange={() =>
                    onUpdate(task.id, { isPrivate: !task.isPrivate })
                  }
                />
              </View>
              {options.length > 0 ? (
                <View className="min-h-[54px] flex-row flex-wrap items-center gap-2.5 px-3.5 py-2">
                  <UserIcon size={16} color={colors.ink['500']} />
                  <Text className="text-ink-800 flex-1 text-sm">
                    {t.assignee}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    {options.map(option => {
                      const active = task.assigneeId === option.id
                      const label = option.name.trim().split(/\s+/)[0]
                      return (
                        <Pressable
                          key={option.id}
                          accessibilityRole="button"
                          onPress={() =>
                            onUpdate(task.id, {
                              assigneeId: active ? null : option.id,
                            })
                          }
                          className={cn(
                            'h-[30px] justify-center rounded-full border-[1.5px] px-2.5',
                            active
                              ? 'border-brand-600 bg-brand-600'
                              : 'border-line bg-surface',
                          )}
                        >
                          <Text
                            className={cn(
                              'text-[12.5px] font-semibold',
                              active ? 'text-white' : 'text-ink-600',
                            )}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </View>
                </View>
              ) : null}
            </View>
            <Text className="text-ink-400 mt-2 px-0.5 text-xs">
              {t.privacyHint}
            </Text>

            {onDelete ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onDelete(task)
                  onClose()
                }}
                className="bg-danger-soft mt-3.5 h-[46px] flex-row items-center justify-center gap-2 rounded-2xl"
              >
                <TrashIcon size={15} color={colors.danger} />
                <Text className="text-danger text-sm font-semibold">
                  {t.delete}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
