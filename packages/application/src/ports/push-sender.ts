export type PushMessage = {
  token: string
  title: string
  body: string
  // Delivered alongside the alert so the app can route a tap to the right
  // screen. Strings only: the payload crosses APNs/FCM as JSON and the app reads
  // it back untyped.
  data?: Record<string, string>
}

export type PushSendResult = {
  delivered: number
  // Tokens the provider says are permanently gone (the app was uninstalled, or
  // the OS reissued the token). The caller deletes these instead of retrying
  // them forever.
  invalidTokens: string[]
}

export interface PushSender {
  send(messages: PushMessage[]): Promise<PushSendResult>
}
