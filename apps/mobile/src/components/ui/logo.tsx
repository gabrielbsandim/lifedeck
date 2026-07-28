// RN rebuild of @lifedeck/ui Logo. The web reads the deck tints from CSS
// custom properties; RN has none, so the same values come from palette.json.
import { Text, View } from 'react-native'
import Svg, { Circle, Rect } from 'react-native-svg'
import { colors } from '@/theme/tokens'

export type LogoMarkProps = {
  size?: number
  monochrome?: boolean
  color?: string
}

export function LogoMark({
  size = 24,
  monochrome = false,
  color = colors.ink['900'],
}: LogoMarkProps) {
  if (monochrome) {
    return (
      <Svg width={size} height={size} viewBox="0 0 32 32">
        <Rect
          x="13"
          y="4"
          width="15"
          height="20"
          rx="4.5"
          fill={color}
          opacity={0.32}
        />
        <Rect
          x="10"
          y="6.5"
          width="15"
          height="20"
          rx="4.5"
          fill={color}
          opacity={0.58}
        />
        <Rect x="7" y="9" width="15" height="20" rx="4.5" fill={color} />
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect
        x="13"
        y="4"
        width="15"
        height="20"
        rx="4.5"
        fill={colors.deck.back}
      />
      <Rect
        x="10"
        y="6.5"
        width="15"
        height="20"
        rx="4.5"
        fill={colors.deck.mid}
      />
      <Rect
        x="7"
        y="9"
        width="15"
        height="20"
        rx="4.5"
        fill={colors.brand['600']}
      />
      <Circle cx="12" cy="14.5" r="2.1" fill={colors.violet['500']} />
    </Svg>
  )
}

export type LogoProps = LogoMarkProps & {
  withWordmark?: boolean
  layout?: 'horizontal' | 'stacked'
}

export function Logo({
  size = 24,
  monochrome = false,
  withWordmark = false,
  layout = 'horizontal',
  color,
}: LogoProps) {
  const mark = <LogoMark size={size} monochrome={monochrome} color={color} />

  if (!withWordmark) {
    return mark
  }

  const stacked = layout === 'stacked'

  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        alignItems: 'center',
        gap: stacked ? size * 0.28 : size * 0.42,
      }}
    >
      {mark}
      <Text
        style={{
          fontWeight: '700',
          letterSpacing: -0.02 * size,
          color: colors.ink['900'],
          fontSize: stacked ? size * 0.52 : size * 0.72,
        }}
      >
        Lifedeck
      </Text>
    </View>
  )
}
