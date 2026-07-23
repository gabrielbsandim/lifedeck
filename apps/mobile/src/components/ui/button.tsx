// First rebuilt @lifedeck/ui primitive. Same prop shape as the web Button,
// styled with NativeWind classes that map to the shared tokens.
import { Pressable, Text, type PressableProps } from 'react-native'

type ButtonProps = PressableProps & {
  title: string
  variant?: 'primary' | 'outline'
}

export function Button({ title, variant = 'primary', ...props }: ButtonProps) {
  const container =
    variant === 'primary' ? 'bg-brand-600' : 'border border-line bg-surface'
  const label = variant === 'primary' ? 'text-white' : 'text-ink-700'

  return (
    <Pressable
      accessibilityRole="button"
      className={`h-11 items-center justify-center rounded-xl px-5 ${container}`}
      {...props}
    >
      <Text className={`text-sm font-semibold ${label}`}>{title}</Text>
    </Pressable>
  )
}
