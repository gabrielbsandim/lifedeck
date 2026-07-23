// RN rebuild of @lifedeck/ui Card.
import { View, type ViewProps } from 'react-native'
import { cn } from '@/lib/cn'

export type CardProps = ViewProps & {
  className?: string
}

export function Card({ className, ...props }: CardProps) {
  return (
    <View
      className={cn(
        'border-line bg-surface rounded-2xl border shadow-sm',
        className,
      )}
      {...props}
    />
  )
}
