import { Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Button, Logo } from '@/components/ui'
import { useI18n } from '@/lib/i18n/messages-provider'

export default function NotFoundScreen() {
  const { messages } = useI18n()
  const router = useRouter()
  const t = messages.errorPage

  return (
    <View className="bg-bg flex-1 justify-center gap-4 px-6">
      <Logo withWordmark size={28} />
      <View className="mt-8 gap-2">
        <Text className="text-brand-accent text-sm font-semibold">404</Text>
        <Text
          accessibilityRole="header"
          className="text-ink-900 text-2xl font-bold"
        >
          {t.notFoundTitle}
        </Text>
        <Text className="text-ink-500 text-sm">{t.notFoundBody}</Text>
      </View>
      <Button className="self-start" onPress={() => router.replace('/')}>
        {t.backHome}
      </Button>
    </View>
  )
}
