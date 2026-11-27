import { useId, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type SegmentedOption<T extends string> = {
  value: T
  label: ReactNode
}

export type SegmentedControlProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

const THUMB_SPRING = { type: 'spring', stiffness: 520, damping: 40 } as const

// Columns share the widest label's width, so the selected thumb keeps one size
// as it slides instead of growing and shrinking with each label.
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedControlProps<T>) {
  const thumbId = useId()
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'bg-bg border-line inline-grid auto-cols-fr grid-flow-col gap-1 rounded-xl border p-1',
        className,
      )}
    >
      {options.map(option => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-sm font-semibold transition-colors duration-200',
              active
                ? 'text-brand-accent-strong'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {active ? (
              <motion.span
                layoutId={thumbId}
                aria-hidden
                className="bg-surface absolute inset-0 rounded-lg shadow-sm"
                transition={THUMB_SPRING}
              />
            ) : null}
            <span className="relative inline-flex items-center gap-2">
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
