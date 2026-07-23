// RN rebuild of @lifedeck/ui TextField: optional label, error text, and the
// same invalid styling. Focus rings are web-only and dropped.
import { Text, TextInput, View, type TextInputProps } from 'react-native'
import { cn } from '@/lib/cn'
import { colors } from '@/theme/tokens'

export type TextFieldProps = TextInputProps & {
  label?: string
  error?: string
  className?: string
}

export function TextField({
  label,
  error,
  className,
  ...props
}: TextFieldProps) {
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
      <TextInput
        placeholderTextColor={colors.ink['400']}
        className={cn(
          'text-ink-800 h-11 rounded-xl border-[1.5px] px-3.5 text-base',
          invalid ? 'border-danger bg-danger/5' : 'border-line bg-surface',
          className,
        )}
        {...props}
      />
      {invalid ? <Text className="text-danger text-xs">{error}</Text> : null}
    </View>
  )
}
