// Auth gate rendered as a full-screen overlay so the Expo Router navigator
// always stays mounted underneath. While the session is loading it shows a
// spinner; with no session it shows the guest onboarding (name → Start),
// mirroring the web onboarding-card; once authenticated it renders nothing.
import { useState } from 'react'
import { ActivityIndicator, Text, TextInput, View } from 'react-native'
import { getCalendars } from 'expo-localization'
import { Button } from '@/components/ui/button'
import { useCreateGuest, useSession } from '@/lib/api/use-session'
import { useI18n } from '@/lib/i18n/messages-provider'
import { colors } from '@/theme/tokens'

export function SessionGate() {
  const { messages, locale } = useI18n()
  const session = useSession()
  const createGuest = useCreateGuest()
  const [name, setName] = useState('')

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
      timezone: getCalendars()[0]?.timeZone ?? undefined,
    })
  }

  return (
    <View className="bg-bg absolute inset-0 justify-center gap-5 px-6">
      <View className="gap-1.5">
        <Text className="text-ink-900 text-2xl font-bold">{t.title}</Text>
        <Text className="text-ink-500 text-sm">{t.subtitle}</Text>
      </View>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t.namePlaceholder}
        autoFocus
        returnKeyType="go"
        onSubmitEditing={onStart}
        className="border-line text-ink-800 bg-surface h-12 rounded-xl border px-3.5 text-base"
      />
      <Button title={t.start} onPress={onStart} disabled={!canStart} />
      {createGuest.isError ? (
        <Text className="text-danger text-sm">{messages.common.error}</Text>
      ) : null}
    </View>
  )
}
