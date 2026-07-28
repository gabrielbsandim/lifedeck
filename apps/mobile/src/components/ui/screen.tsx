// The app-shell equivalent: every screen body sits on `bg` inside the safe
// area, with the same page rhythm the web gives `<AppShell>` (gap-6, px-4).
// `scroll` is on by default; screens that own their own list (FlatList, chat)
// opt out.
import type { ReactNode } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

export type ScreenProps = {
  // Optional so a screen can render the empty shell while its session-gated
  // content is still resolving.
  children?: ReactNode
  scroll?: boolean
  refreshing?: boolean
  onRefresh?: () => void
  className?: string
  contentClassName?: string
}

export function Screen({
  children,
  scroll = true,
  refreshing,
  onRefresh,
  className,
  contentClassName,
}: ScreenProps) {
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()
  // The tab bar already reserves its own height; this is the extra breathing
  // room the web gets from `pb-28`.
  const paddingBottom = insets.bottom + 24

  if (!scroll) {
    return <View className={cn('bg-bg flex-1', className)}>{children}</View>
  }

  return (
    <ScrollView
      className={cn('bg-bg flex-1', className)}
      contentContainerClassName={cn('gap-6 px-4 pt-4', contentClassName)}
      contentContainerStyle={{ paddingBottom }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={onRefresh}
            tintColor={colors.brand['600']}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  )
}
