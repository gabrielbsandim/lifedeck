// Over-the-air updates. EAS Update ships new JS to installed builds, so a fix
// reaches a tester's phone without reinstalling anything.
//
// The applying moment matters: `Updates.reloadAsync()` restarts the JS runtime
// and throws away whatever the user had on screen, so this never reloads while
// they are using the app. It downloads in the background and applies on the
// next return from background, when there is nothing on screen to lose.
import { useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import * as Updates from 'expo-updates'

export function useOtaUpdates(): void {
  // Set once an update is downloaded and waiting. A ref, not state: applying it
  // tears the tree down anyway, so re-rendering for it would be pointless.
  const pending = useRef(false)
  const busy = useRef(false)

  useEffect(() => {
    // Disabled in dev and in Expo Go, where the bundle comes from Metro.
    if (__DEV__ || !Updates.isEnabled) {
      return
    }

    async function download(): Promise<void> {
      if (busy.current || pending.current) {
        return
      }
      busy.current = true
      try {
        const check = await Updates.checkForUpdateAsync()
        if (check.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync()
          pending.current = fetched.isNew
        }
      } catch {
        // Offline, or the update server is unreachable. The installed bundle
        // keeps working, so there is nothing to tell the user about.
      } finally {
        busy.current = false
      }
    }

    function onChange(status: AppStateStatus): void {
      if (status !== 'active') {
        return
      }
      if (pending.current) {
        // Already downloaded before the app went away: swap it in now.
        void Updates.reloadAsync()
        return
      }
      void download()
    }

    void download()
    const subscription = AppState.addEventListener('change', onChange)
    return () => subscription.remove()
  }, [])
}
