import { useEffect, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  variant?: 'center' | 'sheet'
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  variant = 'center',
}: DialogProps) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) {
    return null
  }

  const sheet = variant === 'sheet'

  return (
    <div
      onClick={onClose}
      className={cn(
        'bg-ink-900/30 fixed inset-0 z-50 flex p-4 backdrop-blur-sm',
        sheet ? 'items-end justify-center' : 'items-center justify-center',
      )}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={event => event.stopPropagation()}
        initial={{ opacity: 0, y: sheet ? 24 : 8, scale: sheet ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'w-full bg-white p-5 shadow-lg',
          sheet ? 'max-w-md rounded-t-2xl' : 'max-w-sm rounded-2xl',
        )}
      >
        <h2 className="text-ink-800 mb-4 text-base font-semibold">{title}</h2>
        {children}
      </motion.div>
    </div>
  )
}
