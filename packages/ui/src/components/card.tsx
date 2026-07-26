import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export type CardProps = HTMLAttributes<HTMLDivElement>

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'border-line bg-surface rounded-2xl border shadow-sm',
        className,
      )}
      {...props}
    />
  )
})
