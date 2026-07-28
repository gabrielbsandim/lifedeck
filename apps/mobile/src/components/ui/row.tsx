// A tappable settings/list row: icon, label, optional value, chevron. The web
// draws these as links inside a card; on native they are the standard grouped
// list affordance, so this primitive is app-only (no @lifedeck/ui counterpart).
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRightIcon } from '@/components/icons'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

export type RowProps = {
  label: string
  description?: string
  value?: string
  icon?: ReactNode
  right?: ReactNode
  onPress?: () => void
  destructive?: boolean
  disabled?: boolean
  className?: string
}

export function Row({
  label,
  description,
  value,
  icon,
  right,
  onPress,
  destructive = false,
  disabled = false,
  className,
}: RowProps) {
  const colors = useThemeColors()
  const interactive = Boolean(onPress) && !disabled

  return (
    <Pressable
      accessibilityRole={interactive ? 'button' : undefined}
      disabled={!interactive}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 px-4 py-3.5',
        interactive && 'active:bg-bg',
        disabled && 'opacity-50',
        className,
      )}
    >
      {icon ? <View className="w-6 items-center">{icon}</View> : null}
      <View className="flex-1 gap-0.5">
        <Text
          className={cn(
            'text-[15px] font-medium',
            destructive ? 'text-danger' : 'text-ink-800',
          )}
        >
          {label}
        </Text>
        {description ? (
          <Text className="text-ink-500 text-xs">{description}</Text>
        ) : null}
      </View>
      {value ? (
        <Text className="text-ink-500 text-sm" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {interactive && !right ? (
        <ChevronRightIcon size={18} color={colors.ink['300']} />
      ) : null}
    </Pressable>
  )
}
