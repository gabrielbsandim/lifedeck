// RN rebuild of @lifedeck/ui TaskCheckbox. The web springs the tick in with
// framer-motion; here the check simply mounts (Animated adds no value at this
// size and would fight the list virtualization).
import { Pressable, View } from 'react-native'
import { CheckIcon } from '@/components/icons'
import { cn } from '@/lib/cn'

export type TaskCheckboxProps = {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function TaskCheckbox({
  checked,
  label,
  onChange,
  disabled = false,
}: TaskCheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      // A 24px box is below the 44px touch target guideline, so pad the hit
      // area instead of the visual box.
      hitSlop={10}
      className={cn(
        'h-6 w-6 items-center justify-center rounded-lg border-2',
        checked ? 'border-brand-600 bg-brand-600' : 'border-ink-400 bg-surface',
        disabled && 'opacity-50',
      )}
    >
      {checked ? (
        <CheckIcon size={14} color="#ffffff" />
      ) : (
        <View className="h-3.5 w-3.5" />
      )}
    </Pressable>
  )
}
