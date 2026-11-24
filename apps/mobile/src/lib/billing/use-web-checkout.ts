import { Platform } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { getLocales } from 'expo-localization'
import * as WebBrowser from 'expo-web-browser'
import { apiRequest } from '@/lib/api/client'
import { useSession } from '@/lib/api/use-session'
import { webCheckoutAllowed } from '@/lib/billing/web-checkout'

// EXPO_PUBLIC_ variables are inlined at build time, so this must be read as a
// literal member access, never through a computed key.
const LINK_OUT_ENABLED = process.env.EXPO_PUBLIC_WEB_CHECKOUT === 'on'

/**
 * Whether this build may send the user to the web checkout, and the action
 * that does it. The browser opens through a single-use handoff code, so the
 * purchase lands on this account and not on a fresh guest.
 */
export function useWebCheckout() {
  const session = useSession()
  const allowed =
    Boolean(session.data?.features?.billing) &&
    webCheckoutAllowed({
      os: Platform.OS,
      region: getLocales()[0]?.regionCode ?? null,
      enabled: LINK_OUT_ENABLED,
    })

  const handoff = useMutation({
    mutationFn: async () => {
      const { url } = await apiRequest<{ url: string }>(
        '/api/v1/auth/web-handoff',
        {
          method: 'POST',
          body: JSON.stringify({ next: '/settings/billing' }),
        },
      )
      await WebBrowser.openBrowserAsync(url)
    },
  })

  return {
    allowed,
    open: () => handoff.mutate(),
    isOpening: handoff.isPending,
    failed: handoff.isError,
  }
}
