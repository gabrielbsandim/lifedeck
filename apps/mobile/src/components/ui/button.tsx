// RN rebuild of @lifedeck/ui Button. Same variants (primary | ghost) and
// isLoading prop; web-only pseudo classes (hover/focus-visible/ring/transition)
// become native active: states.
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native'
import { cn } from '@/lib/cn'
import { colors } from '@/theme/tokens'

type ButtonVariant = 'primary' | 'ghost'

export type ButtonProps = Omit<PressableProps, 'children'> & {
  variant?: ButtonVariant
  isLoading?: boolean
  className?: string
  children: ReactNode
}

const CONTAINER: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 active:bg-brand-500',
  ghost: 'bg-transparent active:bg-brand-50',
}

const LABEL: Record<ButtonVariant, string> = {
  primary: 'text-white',
  ghost: 'text-brand-600',
}

export function Button({
  variant = 'primary',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = Boolean(disabled) || isLoading

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={cn(
        'h-11 flex-row items-center justify-center gap-2 rounded-xl px-5',
        CONTAINER[variant],
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? '#ffffff' : colors.brand['600']}
        />
      ) : null}
      {typeof children === 'string' ? (
        <Text className={cn('text-sm font-semibold', LABEL[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  )
}
