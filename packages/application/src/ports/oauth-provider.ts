export type OAuthProfile = {
  email: string
  displayName: string
  emailVerified: boolean
}

export interface OAuthProvider {
  getAuthorizationUrl(state: string): string
  exchangeCode(code: string): Promise<OAuthProfile>
}
