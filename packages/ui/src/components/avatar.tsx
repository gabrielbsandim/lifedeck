import { cn } from '@/utils/cn'

export type AvatarProps = {
  name: string
  tone?: 'brand' | 'violet'
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
}

const TONE_CLASSES: Record<NonNullable<AvatarProps['tone']>, string> = {
  brand: 'bg-brand-600',
  violet: 'bg-violet-500',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase()
}

export function Avatar({
  name,
  tone = 'brand',
  size = 'md',
  className,
}: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full font-semibold text-white',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
