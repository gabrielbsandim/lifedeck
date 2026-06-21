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
              'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
              active
                ? 'text-brand-700 bg-white shadow-sm'
                : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
