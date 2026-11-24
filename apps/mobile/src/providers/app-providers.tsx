// Root provider stack: React Query (same version as the web) + safe area +
// i18n. Locale is detected from the device and resolved to a supported locale.
import { useMemo, type ReactNode } from 'react'
import { getLocales } from 'expo-localization'
import { AppState } from 'react-native'
import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from '@tanstack/react-query'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { detectLocale, getMessages } from '@lifedeck/i18n'
import { bindQueryFocusToAppState } from '@/lib/api/app-focus'
import { MessagesProvider } from '@/lib/i18n/messages-provider'

bindQueryFocusToAppState(focusManager, AppState)

export function AppProviders({ children }: { children: ReactNode }) {
  const queryClient = useMemo(() => new QueryClient(), [])
  const locale = detectLocale(getLocales()[0]?.languageTag ?? null)
  const messages = getMessages(locale)

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <MessagesProvider locale={locale} messages={messages}>
          {children}
        </MessagesProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}
