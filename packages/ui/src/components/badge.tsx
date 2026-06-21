import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type BadgeTone = 'neutral' | 'brand' | 'success' | 'shared'

export type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-bg text-ink-600',
  brand: 'bg-brand-50 text-brand-700',
  success: 'bg-success/15 text-success',
  shared: 'bg-violet-500/15 text-violet-500',
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
