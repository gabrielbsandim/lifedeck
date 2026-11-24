import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type ToastTone = 'success' | 'error'

export type ToastProps = {
  children: ReactNode
  tone?: ToastTone
  action?: ReactNode
  className?: string
}

const ICON_CLASSES: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
}

// An error interrupts (alert); a confirmation waits its turn (status).
const ROLES: Record<ToastTone, 'status' | 'alert'> = {
  success: 'status',
  error: 'alert',
}

export function Toast({
  children,
  tone = 'success',
  action,
  className,
}: ToastProps) {
  return (
    <div
      role={ROLES[tone]}
      className={cn(
        'border-line bg-surface flex items-center gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg',
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
      <span className="text-ink-800 flex-1 text-sm font-medium">
        {children}
      </span>
      {action}
    </div>
  )
}
