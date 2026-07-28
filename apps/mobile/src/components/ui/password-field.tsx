// RN rebuild of @lifedeck/ui PasswordField: a TextField with a reveal toggle.
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { TextInputProps } from 'react-native'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

export type PasswordFieldProps = Omit<
  TextInputProps,
  'secureTextEntry' | 'multiline'
> & {
  label?: string
  error?: string
  showLabel?: string
  hideLabel?: string
  className?: string
}

function EyeGlyph({ visible }: { visible: boolean }) {
  // A one-character glyph reads better here than shipping two more SVG paths
  // for a control this small.
  return <Text className="text-ink-400 text-base">{visible ? '⦸' : '◉'}</Text>
}

export function PasswordField({
  label,
  error,
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  className,
  ...props
}: PasswordFieldProps) {
  const colors = useThemeColors()
  const [visible, setVisible] = useState(false)
  const invalid = Boolean(error)

  return (
    <View className="gap-1.5">
      {label ? (
        <Text
          className={cn(
            'text-sm font-medium',
            invalid ? 'text-danger' : 'text-ink-700',
          )}
        >
          {label}
        </Text>
      ) : null}
      <View className="justify-center">
        <TextInput
          secureTextEntry={!visible}
          placeholderTextColor={colors.ink['400']}
          className={cn(
            'text-ink-800 h-11 rounded-xl border-[1.5px] pl-3.5 pr-11 text-base',
            invalid ? 'border-danger bg-danger/5' : 'border-line bg-surface',
            className,
          )}
          {...props}
        />
        <Pressable
          onPress={() => setVisible(current => !current)}
          accessibilityRole="button"
          accessibilityLabel={visible ? hideLabel : showLabel}
          className="absolute right-0 h-11 w-11 items-center justify-center"
        >
          <EyeGlyph visible={visible} />
        </Pressable>
      </View>
      {invalid ? <Text className="text-danger text-xs">{error}</Text> : null}
    </View>
  )
}
