// RN rebuild of @lifedeck/ui Tabs (segmented control).
import { Pressable, Text, View } from 'react-native'
import { cn } from '@/lib/cn'

export type TabItem = {
  value: string
  label: string
}

export type TabsProps = {
  tabs: TabItem[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <View className={cn('bg-bg flex-row gap-1 rounded-xl p-1', className)}>
      {tabs.map(tab => {
        const active = tab.value === value
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.value)}
            className={cn(
              'flex-1 items-center rounded-lg px-3 py-1.5',
              active && 'bg-surface shadow-sm',
            )}
          >
            <Text
              className={cn(
                'text-sm font-semibold',
                active ? 'text-brand-700' : 'text-ink-500',
              )}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
