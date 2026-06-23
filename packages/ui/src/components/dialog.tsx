import { useEffect, useRef, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/utils/cn'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

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
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const node = dialogRef.current
      if (!node) return
      const focusables = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      const first = focusables.at(0)
      const last = focusables.at(-1)
      if (!first || !last) {
        event.preventDefault()
        return
      }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus?.()
    }
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={event => event.stopPropagation()}
        initial={{ opacity: 0, y: sheet ? 24 : 8, scale: sheet ? 1 : 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'w-full bg-white p-5 shadow-lg outline-none',
          sheet ? 'max-w-md rounded-t-2xl' : 'max-w-sm rounded-2xl',
        )}
      >
        {sheet && (
          <div
            aria-hidden
            className="bg-line mx-auto mb-4 h-1 w-9 rounded-full"
          />
        )}
        <h2 className="text-ink-800 mb-4 text-base font-semibold">{title}</h2>
        {children}
      </motion.div>
    </div>
  )
}
