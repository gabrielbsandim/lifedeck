// Push registration, kept out of the React tree so sign-out can reach it.
//
// The Expo push token identifies the installation, not the person, so it has to
// be handed back on sign-out: the phone stays in someone's hand and the next
// alert would put the previous user's tasks on its lock screen.
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { apiRequest } from '@/lib/api/client'

const DEVICES_PATH = '/api/v1/notifications/devices'

// The token of the registration this install currently holds. Module state
// rather than a store: it is written once per launch and read once on sign-out.
let registeredToken: string | null = null

function platform(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return Platform.OS
  }
  return null
}

// EAS writes the project id into the config; without it Expo cannot mint a
// token, and asking for one throws rather than returning null.
function projectId(): string | undefined {
  const easConfig = Constants.expoConfig?.extra?.eas as
    | { projectId?: string }
    | undefined
  return easConfig?.projectId ?? Constants.easConfig?.projectId
}

// Android needs the channel to exist before the first notification arrives, and
// its id has to match the one the server sends (`default`), or the OS files the
// alert under a channel the user cannot configure.
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return
  }
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Lifedeck',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#6d4ae6',
  })
}

/**
 * Asks for permission if it has not been asked for yet, then registers this
 * installation. Returns false whenever push cannot work here (a simulator, a
 * denied prompt, no EAS project), which is a normal outcome rather than an
 * error: the in-app notification bell still gets everything.
 */
export async function registerForPush(): Promise<boolean> {
  const os = platform()
  // Simulators cannot receive push at all, and asking there throws.
  if (!os || !Device.isDevice) {
    return false
  }

  const existing = await Notifications.getPermissionsAsync()
  const granted =
    existing.granted ||
    (existing.canAskAgain
      ? (await Notifications.requestPermissionsAsync()).granted
      : false)
  if (!granted) {
    return false
  }

  await ensureAndroidChannel()

  const id = projectId()
  if (!id) {
    return false
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: id,
  })
  await apiRequest(DEVICES_PATH, {
    method: 'POST',
    body: JSON.stringify({ token, platform: os }),
  })
  registeredToken = token
  return true
}

/**
 * Hands the registration back. Best-effort: sign-out must complete even if the
 * network call fails, and a token left behind is cleaned up server-side the
 * first time the provider reports it as gone.
 */
export async function unregisterFromPush(): Promise<void> {
  const token = registeredToken
  if (!token) {
    return
  }
  registeredToken = null
  try {
    await apiRequest(DEVICES_PATH, {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    })
  } catch {
    // Signing out locally matters more than tidying the server.
  }
}
