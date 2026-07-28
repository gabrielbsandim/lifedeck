// RN rebuild of @lifedeck/ui Toast.
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { cn } from '@/lib/cn'

type ToastTone = 'success' | 'error'

export type ToastProps = {
  children: ReactNode
  tone?: ToastTone
  className?: string
}

const ICON: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
}

export function Toast({ children, tone = 'success', className }: ToastProps) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        'border-line bg-surface flex-row items-center gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg',
        className,
      )}
    >
      <View
        className={cn(
          'h-5 w-5 items-center justify-center rounded-full',
          ICON[tone],
        )}
      >
        <Text className="text-xs font-bold text-white">
          {tone === 'success' ? '✓' : '!'}
        </Text>
      </View>
      {typeof children === 'string' ? (
        <Text className="text-ink-800 flex-1 text-sm font-medium">
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  )
}
