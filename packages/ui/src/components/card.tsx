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
        'border-line rounded-2xl border bg-white shadow-sm',
        className,
      )}
      {...props}
    />
  )
})
