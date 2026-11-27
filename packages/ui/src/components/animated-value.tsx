import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/utils/cn'

export type AnimatedValueProps = {
  value: string | number
  className?: string
}

const EASE = [0.2, 0, 0, 1] as const

export function AnimatedValue({ value, className }: AnimatedValueProps) {
  const reduceMotion = useReducedMotion()
  const shift = reduceMotion ? 0 : 8
  return (
    <span className={cn('relative inline-flex', className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          className="inline-block"
          initial={{ opacity: 0, y: shift }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -shift }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
