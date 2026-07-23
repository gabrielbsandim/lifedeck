// RN rebuild of @lifedeck/ui Avatar: initials fallback with an optional image
// overlay that hides itself on load error.
import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { cn } from '@/lib/cn'

export type AvatarProps = {
  name: string
  src?: string | null
  tone?: 'brand' | 'violet'
  size?: 'sm' | 'md'
  className?: string
}

const CONTAINER: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
}

const LABEL: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'text-xs',
  md: 'text-sm',
}

const TONE: Record<NonNullable<AvatarProps['tone']>, string> = {
  brand: 'bg-brand-600',
  violet: 'bg-violet-500',
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0]!.charAt(0).toUpperCase()
  }
  return (
    parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)
  ).toUpperCase()
}

export function Avatar({
  name,
  src,
  tone = 'brand',
  size = 'md',
  className,
}: AvatarProps) {
  // Tie the failure to the specific src so a new src re-shows the image
  // without an effect (resetting state in an effect is discouraged).
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const showImage = Boolean(src) && failedSrc !== src

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        CONTAINER[size],
        TONE[tone],
        className,
      )}
    >
      <Text className={cn('font-semibold text-white', LABEL[size])}>
        {initials(name)}
      </Text>
      {showImage ? (
        <Image
          source={{ uri: src as string }}
          onError={() => setFailedSrc(src ?? null)}
          className="absolute inset-0 h-full w-full"
        />
      ) : null}
    </View>
  )
}
