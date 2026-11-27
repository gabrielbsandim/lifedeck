import { useId } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

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
  const thumbId = useId()
  return (
    <div
      role="tablist"
      className={cn('bg-bg flex gap-1 rounded-xl p-1', className)}
    >
      {tabs.map(tab => {
        const active = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors duration-200',
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
                transition={{ type: 'spring', stiffness: 520, damping: 40 }}
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
