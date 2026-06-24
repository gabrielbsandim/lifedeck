import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

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
    <div
      className={cn(
        'border-line flex flex-col items-center rounded-2xl border bg-white px-6 py-8 text-center',
        className,
      )}
    >
      {icon && (
        <div className="bg-brand-50 text-brand-600 mb-3 flex h-12 w-12 items-center justify-center rounded-2xl">
          {icon}
        </div>
      )}
      <p className="text-ink-800 text-[15px] font-semibold">{title}</p>
      {description && (
        <p className="text-ink-500 mt-1 max-w-xs text-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
