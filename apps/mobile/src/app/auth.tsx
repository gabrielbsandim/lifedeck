// Landing route for the Google sign-in deep link, `lifedeck://auth?code=...`.
//
// This has to exist as a route, not just as a Linking listener: Expo Router owns
// incoming links, so without a file at this path the redirect lands on the
// router's "Unmatched Route" screen no matter what a listener does with it.
import { useEffect, useRef } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useExchangeGoogleCode } from '@/lib/api/use-auth'
import { claimCode } from '@/lib/auth/use-google-auth'
import { useThemeColors } from '@/theme/tokens'

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string }>()
  const exchange = useExchangeGoogleCode()
  const router = useRouter()
  const colors = useThemeColors()
  // The exchange is single-use, so it must not be retried by a re-render or by
  // React 19 invoking the effect twice.
  const started = useRef(false)

  const { code } = params

  useEffect(() => {
    if (started.current) {
      return
    }
    started.current = true

    // Back to the board either way. A failed sign-in leaves the session as it
    // was, and the sign-in sheet is one tap away; parking the user on a dead
    // callback screen would be worse than a silent retry.
    const done = () => router.replace('/')

    if (!code || !claimCode(code)) {
      // No code, or the auth session already spent it before the OS routed us
      // here. Either way there is nothing left to do.
      done()
      return
    }
    exchange.mutate(code, { onSettled: done })
  }, [code, exchange, router])

  return (
    <View className="bg-bg flex-1 items-center justify-center">
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={colors.brand.accent} />
    </View>
  )
}
