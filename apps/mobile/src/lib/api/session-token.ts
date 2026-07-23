// The mobile session token (the same HS256 JWT the web keeps in an httpOnly
// cookie) is stored in the device keychain and sent as a Bearer header.
import * as SecureStore from 'expo-secure-store'

const SESSION_KEY = 'lifedeck_session'

export function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY)
}

export function setSessionToken(token: string): Promise<void> {
  return SecureStore.setItemAsync(SESSION_KEY, token)
}

export function clearSessionToken(): Promise<void> {
  return SecureStore.deleteItemAsync(SESSION_KEY)
}
