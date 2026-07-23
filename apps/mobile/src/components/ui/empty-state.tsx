// RN rebuild of @lifedeck/ui EmptyState.
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

export type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        'border-line bg-surface items-center rounded-2xl border px-6 py-8',
        className,
      )}
    >
      {icon ? (
        <View className="bg-brand-50 mb-3 h-12 w-12 items-center justify-center rounded-2xl">
          {icon}
        </View>
      ) : null}
      <Text className="text-ink-800 text-center text-[15px] font-semibold">
        {title}
      </Text>
      {description ? (
        <Text className="text-ink-500 mt-1 max-w-xs text-center text-sm">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-4">{action}</View> : null}
    </View>
  )
}
