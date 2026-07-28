// Auth gate rendered as a full-screen overlay so the Expo Router navigator
// always stays mounted underneath. While the session is loading it shows a
// spinner; with no session it shows the guest onboarding (name → Start) plus
// the sign-in entry point, mirroring the web onboarding-card; once
// authenticated it renders nothing.
import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { AuthDialog } from '@/components/auth-dialog'
import { Button, Logo, TextField } from '@/components/ui'
import { deviceTimeZone } from '@/lib/api/dates'
import { useCreateGuest, useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { useThemeColors } from '@/theme/tokens'

export function SessionGate() {
  const { messages, locale } = useI18n()
  const colors = useThemeColors()
  const session = useSession()
  const createGuest = useCreateGuest()
  const [name, setName] = useState('')
  const [signInOpen, setSignInOpen] = useState(false)

  if (session.data) {
    return null
  }

  if (session.isPending) {
    return (
      <View className="bg-bg absolute inset-0 items-center justify-center">
        <ActivityIndicator color={colors.brand['600']} />
      </View>
    )
  }

  const t = messages.onboarding
  const canStart = name.trim().length > 0 && !createGuest.isPending

  function onStart() {
    const displayName = name.trim()
    if (!displayName) {
      return
    }
    createGuest.mutate({
      displayName,
      locale,
      timezone: deviceTimeZone(),
    })
  }

  return (
    <View className="bg-bg absolute inset-0 justify-center gap-5 px-6">
      <View className="border-line gap-3 border-b pb-6">
        <Logo withWordmark size={30} />
        <Text className="text-ink-600 text-base font-medium">
          {messages.app.tagline}
        </Text>
      </View>
      <View className="gap-1.5">
        <Text className="text-ink-900 text-2xl font-bold">{t.title}</Text>
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
      </View>
      <TextField
        value={name}
        onChangeText={setName}
        placeholder={t.namePlaceholder}
        maxLength={80}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={onStart}
      />
      <Button
        onPress={onStart}
        disabled={!canStart}
        isLoading={createGuest.isPending}
      >
        {t.start}
      </Button>
      {createGuest.isError ? (
        <Text className="text-danger text-sm">{messages.common.error}</Text>
      ) : null}

      <Pressable accessibilityRole="button" onPress={() => setSignInOpen(true)}>
        <Text className="text-brand-accent text-center text-sm font-medium">
          {messages.auth.haveAccount}
        </Text>
      </Pressable>

      <AuthDialog
        open={signInOpen}
        onClose={() => setSignInOpen(false)}
        initialMode="signin"
      />
    </View>
  )
}
