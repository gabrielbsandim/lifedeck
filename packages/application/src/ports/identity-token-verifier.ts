import type { OAuthProfile } from '@/ports/oauth-provider'

// Checks an identity token a native SDK handed the app (Sign in with Apple)
// and returns the profile it vouches for. Throws InvalidIdentityTokenError when
// the token is forged, expired or meant for another app.
export interface IdentityTokenVerifier {
  verify(identityToken: string): Promise<OAuthProfile>
}
