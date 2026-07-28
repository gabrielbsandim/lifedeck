// Reordering on native.
//
// The web drags rows with dnd-kit. Dragging inside a scroll view needs a
// gesture library and fights the list's own pan, so the app uses the pattern
// iOS and Android settings screens use instead: a long press puts the list in
// reorder mode, where each row gets explicit move controls. It is also the
// accessible option — a drag has no keyboard or screen-reader equivalent.
import { useState, type ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

export type ReorderableListProps<T> = {
  items: T[]
  getId: (item: T) => string
  onReorder: (ids: string[]) => void
  renderItem: (item: T, options: { onLongPress: () => void }) => ReactNode
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  if (moved !== undefined) {
    next.splice(to, 0, moved)
  }
  return next
}

export function ReorderableList<T>({
  items,
  getId,
  onReorder,
  renderItem,
}: ReorderableListProps<T>) {
  const { messages } = useI18n()
  const colors = useThemeColors()
  const [order, setOrder] = useState<T[] | null>(null)

  if (order === null) {
    return (
      <>
        {items.map(item => (
          <View key={getId(item)}>
            {renderItem(item, { onLongPress: () => setOrder(items) })}
          </View>
        ))}
      </>
    )
  }

  function commit(next: T[]) {
    setOrder(next)
    onReorder(next.map(getId))
  }

  return (
    <>
      <View className="bg-brand-50 flex-row items-center gap-3 px-4 py-2">
        <Text className="text-brand-accent-strong flex-1 text-xs font-semibold">
          {messages.task.reorder}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setOrder(null)}
          className="px-2 py-1"
        >
          <Text className="text-brand-accent-strong text-xs font-bold">
            {messages.task.save}
          </Text>
        </Pressable>
      </View>
      {order.map((item, index) => (
        <View
          key={getId(item)}
          className="border-line bg-surface flex-row items-center border-b"
        >
          <View className="flex-1">
            {renderItem(item, { onLongPress: () => {} })}
          </View>
          <View className="gap-1 px-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="↑"
              disabled={index === 0}
              onPress={() => commit(move(order, index, index - 1))}
              className="bg-bg h-7 w-7 items-center justify-center rounded-lg"
              style={index === 0 ? { opacity: 0.3 } : undefined}
            >
              <Text style={{ color: colors.ink['700'] }}>↑</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="↓"
              disabled={index === order.length - 1}
              onPress={() => commit(move(order, index, index + 1))}
              className="bg-bg h-7 w-7 items-center justify-center rounded-lg"
              style={index === order.length - 1 ? { opacity: 0.3 } : undefined}
            >
              <Text style={{ color: colors.ink['700'] }}>↓</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </>
  )
}
