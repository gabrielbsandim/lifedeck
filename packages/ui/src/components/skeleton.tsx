import { cn } from '@/utils/cn'

export type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cn(
        'animate-shimmer from-line via-bg to-line rounded-lg bg-gradient-to-r bg-[length:200%_100%]',
        className,
      )}
    />
  )
}
