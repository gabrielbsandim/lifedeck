export type OAuthProfile = {
  email: string
  displayName: string
  emailVerified: boolean
  avatarUrl?: string | null
}

export interface OAuthProvider {
  getAuthorizationUrl(state: string): string
  exchangeCode(code: string): Promise<OAuthProfile>
}
