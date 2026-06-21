import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error'

export type ToastProps = {
  children: ReactNode
  tone?: ToastTone
  className?: string
}

const ICON_CLASSES: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
}

export function Toast({ children, tone = 'success', className }: ToastProps) {
  return (
    <div
      role="status"
      className={cn(
        'border-line flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-3 shadow-lg',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex h-5 w-5 flex-none items-center justify-center rounded-full text-xs font-bold text-white',
          ICON_CLASSES[tone],
        )}
      >
        {tone === 'success' ? '✓' : '!'}
      </span>
      <span className="text-ink-800 text-sm font-medium">{children}</span>
    </div>
  )
}
