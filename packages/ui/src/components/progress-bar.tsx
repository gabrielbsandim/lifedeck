import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type ProgressBarProps = {
  value: number
  label?: string
  className?: string
}

function clamp(value: number): number {
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const pct = clamp(value)
  const complete = pct === 100

  return (
    <div
      className={cn('rounded-full', complete && 'animate-glow', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="bg-brand-50 h-2 overflow-hidden rounded-full">
        <motion.div
          className={cn(
            'h-full rounded-full',
            complete
              ? 'from-brand-600 bg-gradient-to-r to-violet-500'
              : 'bg-brand-600',
          )}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
    </div>
  )
}
