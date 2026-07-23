// RN rebuild of @lifedeck/ui Badge.
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'shared'

export type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const CONTAINER: Record<BadgeTone, string> = {
  neutral: 'bg-bg',
  brand: 'bg-brand-50',
  success: 'bg-success/15',
  shared: 'bg-violet-500/15',
}

const LABEL: Record<BadgeTone, string> = {
  neutral: 'text-ink-600',
  brand: 'text-brand-700',
  success: 'text-success',
  shared: 'text-violet-500',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <View
      className={cn(
        'h-6 flex-row items-center gap-1.5 self-start rounded-full px-2.5',
        CONTAINER[tone],
        className,
      )}
    >
      {typeof children === 'string' ? (
        <Text className={cn('text-xs font-semibold', LABEL[tone])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}
