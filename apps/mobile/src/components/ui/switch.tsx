// The platform Switch, pre-themed with the brand track so screens do not repeat
// the color wiring. Stands in for the web's toggle checkbox.
import { Switch as RNSwitch } from 'react-native'
import { useThemeColors } from '@/theme/tokens'

export type SwitchProps = {
  value: boolean
  onValueChange: (value: boolean) => void
  disabled?: boolean
  accessibilityLabel?: string
}

export function Switch({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
}: SwitchProps) {
  const colors = useThemeColors()
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: colors.line, true: colors.brand['600'] }}
      thumbColor={colors.surface}
      ios_backgroundColor={colors.line}
    />
  )
}
