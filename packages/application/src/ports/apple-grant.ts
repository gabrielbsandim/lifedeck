import type { EntityId } from '@lifedeck/domain'

/** Apple's token endpoint for the app's own Sign in with Apple grant. */
export interface AppleTokenClient {
  /** Trades the one-time authorization code for a long-lived refresh token. */
  exchange(authorizationCode: string): Promise<string>
  revoke(refreshToken: string): Promise<void>
}

export interface AppleGrantStore {
  save(userId: EntityId, refreshToken: string): Promise<void>
  find(userId: EntityId): Promise<string | null>
}

export type AppleGrants = {
  client: AppleTokenClient
  store: AppleGrantStore
}
