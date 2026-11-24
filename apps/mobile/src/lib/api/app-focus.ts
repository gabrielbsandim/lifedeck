import type { AppStateStatus } from 'react-native'

type AppStateSource = {
  addEventListener(
    type: 'change',
    listener: (status: AppStateStatus) => void,
  ): { remove(): void }
}

type FocusTarget = {
  setEventListener(
    setup: (onFocus: (focused?: boolean) => void) => () => void,
  ): void
}

// React Query reads focus from `document`, which React Native lacks, so it
// treats the app as always focused and keeps polling from the background.
export function bindQueryFocusToAppState(
  focus: FocusTarget,
  appState: AppStateSource,
): void {
  focus.setEventListener(onFocus => {
    const subscription = appState.addEventListener('change', status =>
      onFocus(status === 'active'),
    )
    return () => subscription.remove()
  })
}
