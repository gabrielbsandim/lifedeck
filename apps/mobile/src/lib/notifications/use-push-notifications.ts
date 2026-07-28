// Wires push into the app: registers the installation once a real user is
// signed in, keeps the bell in sync when an alert arrives, and routes a tap to
// the screen the notification is about.
import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import * as Notifications from 'expo-notifications'
import { notificationsKey } from '@/lib/api/use-notifications'
import { useSession } from '@/lib/api/use-session'
import { registerForPush } from '@/lib/notifications/push-registration'

// Foreground behaviour. An alert that arrives while the user is looking at the
// app is still worth showing: the reminder is time-sensitive and the bell is a
// badge they may not be looking at.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

// Where a tapped notification lands. Anything unrecognised falls through to the
// board, which is where the app opens anyway.
function routeFor(data: Record<string, unknown>): string {
  switch (data.type) {
    case 'event-reminder':
      return '/calendar'
    case 'habit-checkin':
      return '/habits'
    default:
      return '/'
  }
}

export function usePushNotifications(): void {
  const session = useSession()
  const queryClient = useQueryClient()
  const router = useRouter()
  const user = session.data
  // Guests have nothing to be notified about yet, and registering would tie the
  // device to a session that disappears the moment they sign in properly.
  const eligible = Boolean(user) && user?.isGuest === false
  const registered = useRef(false)

  useEffect(() => {
    if (!eligible || registered.current) {
      return
    }
    // Marked before the await so React 19's double-invoked effects cannot fire
    // two permission prompts.
    registered.current = true
    void registerForPush().catch(() => {
      // Permission denied, a simulator, or no EAS project. The bell still works,
      // so there is nothing to report to the user here.
    })
  }, [eligible])

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      // The same event is already in the bell; refetch so the badge agrees with
      // what just appeared on the lock screen.
      void queryClient.invalidateQueries({ queryKey: notificationsKey })
    })
    const tapped = Notifications.addNotificationResponseReceivedListener(
      response => {
        const data = response.notification.request.content.data ?? {}
        router.push(routeFor(data))
      },
    )
    return () => {
      received.remove()
      tapped.remove()
    }
  }, [queryClient, router])
}
