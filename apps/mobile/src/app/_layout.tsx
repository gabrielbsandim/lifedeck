import '../global.css'

import { Text, useColorScheme, View } from 'react-native'
import { Stack, type ErrorBoundaryProps } from 'expo-router'
import { getLocales } from 'expo-localization'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { detectLocale, getMessages } from '@lifedeck/i18n'
import { GetStartedSheet } from '@/components/get-started-sheet'
import { SessionGate } from '@/components/session-gate'
import { Button, Logo } from '@/components/ui'
import { useI18n } from '@/lib/i18n/messages-provider'
import { usePushNotifications } from '@/lib/notifications/use-push-notifications'
import { useOtaUpdates } from '@/lib/updates/use-ota-updates'
import { AppProviders } from '@/providers/app-providers'
import { useThemeColors } from '@/theme/tokens'

// Secondary routes are pushed on top of the tab shell, so they get a native
// back header — the app's equivalent of the web's sidebar links and the
// Profile hub. The tab group owns its own headers.
function RootStack() {
  const { messages } = useI18n()
  const colors = useThemeColors()

  // Pull the newest JS bundle in the background so a tester's phone stays on
  // the current build without reinstalling anything.
  useOtaUpdates()

  // Registers the device for push once a real account is signed in, and routes
  // a tapped alert to the screen it is about.
  usePushNotifications()

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.ink['900'] },
        headerTintColor: colors.brand.accent,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen
        name="lists/[id]"
        options={{ title: messages.lists.title }}
      />
      <Stack.Screen name="habits" options={{ title: messages.habits.title }} />
      <Stack.Screen
        name="booking"
        options={{ title: messages.bookingHost.title }}
      />
      <Stack.Screen
        name="recurring"
        options={{ title: messages.recurring.title }}
      />
      <Stack.Screen
        name="calendar"
        options={{ title: messages.calendar.title }}
      />
      <Stack.Screen
        name="analytics"
        options={{ title: messages.analytics.title }}
      />
      <Stack.Screen
        name="developers"
        options={{ title: messages.developers.title }}
      />
      <Stack.Screen
        name="settings"
        options={{ title: messages.settings.title }}
      />
      <Stack.Screen
        name="billing"
        options={{ title: messages.billing.title }}
      />
      <Stack.Screen
        name="share/[token]"
        options={{ title: messages.list.shared }}
      />
      <Stack.Screen
        name="terms"
        options={{ title: messages.legal.terms.title }}
      />
      <Stack.Screen
        name="privacy"
        options={{ title: messages.legal.privacy.title }}
      />
      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
  )
}

export default function RootLayout() {
  const scheme = useColorScheme()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View style={{ flex: 1 }}>
          <RootStack />
          <SessionGate />
          <GetStartedSheet />
        </View>
      </AppProviders>
    </GestureHandlerRootView>
  )
}

// Replaces the whole tree when a render throws, so it cannot lean on the
// providers above it: the copy is resolved straight from the device locale.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const messages = getMessages(
    detectLocale(getLocales()[0]?.languageTag ?? null),
  )
  const t = messages.errorPage

  return (
    <View className="bg-bg flex-1 justify-center gap-4 px-6">
      <Logo withWordmark size={28} />
      <View className="mt-8 gap-2">
        <Text
          accessibilityRole="header"
          className="text-ink-900 text-2xl font-bold"
        >
          {t.crashTitle}
        </Text>
        <Text className="text-ink-500 text-sm">{t.crashBody}</Text>
      </View>
      <Button className="self-start" onPress={() => void retry()}>
        {messages.common.retry}
      </Button>
    </View>
  )
}
