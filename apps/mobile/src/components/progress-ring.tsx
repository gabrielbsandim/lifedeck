// The daily board's completion ring. The web draws it with an inline <svg> and
// a dash-offset transition; react-native-svg takes the same two circles.
import { Text, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useThemeColors } from '@/theme/tokens'

const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function ProgressRing({
  percent,
  size = 70,
}: {
  percent: number
  size?: number
}) {
  const colors = useThemeColors()
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <Circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke={colors.brand['100']}
          strokeWidth="7"
        />
        <Circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          stroke={colors.brand['600']}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - clamped / 100)}
          // The ring starts at 12 o'clock, not 3 o'clock.
          transform="rotate(-90 36 36)"
        />
      </Svg>
      <Text className="text-brand-accent-strong absolute text-[15px] font-extrabold">
        {clamped}%
      </Text>
    </View>
  )
}
