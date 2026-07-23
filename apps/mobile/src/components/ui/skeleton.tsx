// RN rebuild of @lifedeck/ui Skeleton. The web uses a CSS shimmer gradient;
// on native we pulse opacity with the built-in Animated API (no reanimated
// worklets needed). Sizing/shape come from the className on the wrapper.
import { useEffect, useState } from 'react'
import { Animated, View } from 'react-native'
import { cn } from '@/lib/cn'
import { colors } from '@/theme/tokens'

export type SkeletonProps = {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.5))

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [opacity])

  return (
    <View className={cn('overflow-hidden rounded-lg', className)}>
      <Animated.View
        style={{ flex: 1, backgroundColor: colors.line, opacity }}
      />
    </View>
  )
}
