import { useState, useSyncExternalStore } from 'react'
import { browserTimeZone } from '@/lib/api/dates'

const noSubscription = () => () => {}

// The server cannot know the visitor's zone, so it renders null and the browser
// fills it in on hydration without a mismatch. A known zone (the one the client
// booked in) wins over the browser's, and a pick from the switcher wins over both.
export function useViewerTimeZone(preferred?: string | null) {
  const detected = useSyncExternalStore(
    noSubscription,
    browserTimeZone,
    () => null,
  )
  const [chosen, setChosen] = useState<string | null>(null)
  return [chosen ?? preferred ?? detected, setChosen] as const
}
