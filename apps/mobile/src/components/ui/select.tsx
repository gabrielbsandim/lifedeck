// RN stand-in for the web's <select>: a field that opens a bottom sheet of
// options. Same contract as the web control (value + onChange + options), so
// screens read the same on both platforms.
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { CheckIcon, ChevronDownIcon } from '@/components/icons'
import { Dialog } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { useThemeColors } from '@/theme/tokens'

export type SelectOption = {
  value: string
  label: string
}

export type SelectProps = {
  label?: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  title?: string
  disabled?: boolean
  className?: string
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder,
  title,
  disabled = false,
  className,
}: SelectProps) {
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)

  return (
    <View className={cn('gap-1.5', className)}>
      {label ? (
        <Text className="text-ink-700 text-sm font-medium">{label}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label ?? title ?? placeholder}
        disabled={disabled}
        onPress={() => setOpen(true)}
        className={cn(
          'border-line bg-surface h-11 flex-row items-center justify-between rounded-xl border-[1.5px] px-3.5',
          disabled && 'opacity-50',
        )}
      >
        <Text
          className={cn(
            'flex-1 text-base',
            selected ? 'text-ink-800' : 'text-ink-400',
          )}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder ?? ''}
        </Text>
        <ChevronDownIcon size={18} color={colors.ink['400']} />
      </Pressable>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={title ?? label ?? ''}
        variant="sheet"
      >
        <ScrollView>
          {options.map(option => {
            const active = option.value === value
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className="active:bg-bg flex-row items-center gap-3 rounded-xl px-2 py-3"
              >
                <Text
                  className={cn(
                    'flex-1 text-[15px]',
                    active ? 'text-brand-accent font-semibold' : 'text-ink-800',
                  )}
                >
                  {option.label}
                </Text>
                {active ? (
                  <CheckIcon size={16} color={colors.brand.accent} />
                ) : null}
              </Pressable>
            )
          })}
        </ScrollView>
      </Dialog>
    </View>
  )
}
