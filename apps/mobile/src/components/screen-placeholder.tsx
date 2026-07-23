// Temporary screen body used while each route is ported from the web. Every
// tab renders one of these so the navigation shell is testable end to end.
import { View, Text } from 'react-native'

export function ScreenPlaceholder({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <View className="bg-bg flex-1 items-center justify-center gap-2 px-6">
      <Text className="text-ink-900 text-2xl font-bold">{title}</Text>
      <Text className="text-ink-500 text-center text-sm">{subtitle}</Text>
    </View>
  )
}
