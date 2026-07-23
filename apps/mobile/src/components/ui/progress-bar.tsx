// RN rebuild of @lifedeck/ui ProgressBar. The web animates the fill with
// framer-motion; here the width is set directly (animation can be layered in
// later with Animated if needed).
import { View } from 'react-native'
import { cn } from '@/lib/cn'

export type ProgressBarProps = {
  value: number
  label?: string
  className?: string
}

function clamp(value: number): number {
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }
  return value
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = clamp(value)

  return (
    <View
      className={cn('rounded-full', className)}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: pct, min: 0, max: 100 }}
      accessibilityLabel={label}
    >
      <View className="bg-brand-50 h-2 overflow-hidden rounded-full">
        <View
          className="bg-brand-600 h-full rounded-full"
          style={{ width: `${pct}%` }}
        />
      </View>
    </View>
  )
}
