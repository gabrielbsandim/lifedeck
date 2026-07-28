import '../global.css'

import { useColorScheme, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SessionGate } from '@/components/session-gate'
import { useGoogleAuthDeepLink } from '@/lib/auth/use-google-auth'
import { useI18n } from '@/lib/i18n/messages-provider'
import { AppProviders } from '@/providers/app-providers'
import { useThemeColors } from '@/theme/tokens'

// Secondary routes are pushed on top of the tab shell, so they get a native
// back header — the app's equivalent of the web's sidebar links and the
// Profile hub. The tab group owns its own headers.
function RootStack() {
  const { messages } = useI18n()
  const colors = useThemeColors()

  // Completing Google sign-in means catching the `lifedeck://auth?code=...`
  // deep link the OAuth callback redirects to; mounting it here covers both a
  // cold start from the link and a warm return to the app.
  useGoogleAuthDeepLink()

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
      <Stack.Screen
        name="lists/[id]"
        options={{ title: messages.lists.title }}
      />
      <Stack.Screen name="habits" options={{ title: messages.habits.title }} />
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
        </View>
      </AppProviders>
    </GestureHandlerRootView>
  )
}
